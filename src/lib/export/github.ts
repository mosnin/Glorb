import { Octokit } from "octokit";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface SyncOptions {
  accessToken: string;
  repoFullName: string;
  branch?: string;
  files: { path: string; storagePath: string }[];
  commitMessage?: string;
}

export async function syncToGitHub(options: SyncOptions) {
  const { accessToken, repoFullName, branch = "main", files, commitMessage = "Update agent files from Glorb" } = options;
  const [owner, repo] = repoFullName.split("/");
  const octokit = new Octokit({ auth: accessToken });
  const supabase = getAdmin();

  // Get the current commit SHA for the branch
  let baseSha: string;
  try {
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    baseSha = ref.object.sha;
  } catch {
    // Branch doesn't exist, create from default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${repoData.default_branch}`,
    });
    baseSha = ref.object.sha;
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });
  }

  // Get the tree SHA
  const { data: commit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: baseSha,
  });

  // Create blobs for each file
  const treeEntries = [];
  for (const file of files) {
    const { data: blob } = await supabase.storage
      .from("agent-files")
      .download(file.storagePath);

    if (!blob) continue;

    const content = await blob.text();
    const { data: gitBlob } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: Buffer.from(content).toString("base64"),
      encoding: "base64",
    });

    treeEntries.push({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: gitBlob.sha,
    });
  }

  // Create tree
  const { data: tree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: commit.tree.sha,
    tree: treeEntries,
  });

  // Create commit
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: tree.sha,
    parents: [baseSha],
  });

  // Update branch reference
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return { sha: newCommit.sha };
}
