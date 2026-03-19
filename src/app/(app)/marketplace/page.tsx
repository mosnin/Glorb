"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bot, Network, Star, GitFork, Loader2, Globe, TrendingUp } from "lucide-react";
import { ApiError } from "@/components/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/pagination";
import { toast } from "sonner";

const PAGE_SIZE = 24;

interface Listing {
  id: string;
  entity_type: "agent" | "cluster";
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  is_featured: boolean;
  use_count: number;
  rating_sum: number;
  rating_count: number;
  user_id: string;
  published_at: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "agent" | "cluster">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [forkDialog, setForkDialog] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace?${params}`);
      if (!res.ok) throw new Error(`Failed to load marketplace (${res.status})`);
      const data = await res.json();
      setListings(data.items || (Array.isArray(data) ? data : []));
      setTotal(data.total ?? (data.items || data).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleFork(listing: Listing) {
    setForkingId(listing.id);
    try {
      const res = await fetch(`/api/marketplace/${listing.id}/fork`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Forked successfully!");
        setForkDialog(null);
        router.push(data.type === "agent" ? `/agents/${data.id}` : `/clusters/${data.id}`);
      } else {
        toast.error(data.error || "Fork failed");
      }
    } finally {
      setForkingId(null);
    }
  }

  const categories = [...new Set(listings.map((l) => l.category))];
  const featured = listings.filter((l) => l.is_featured);
  const rest = listings.filter((l) => !l.is_featured);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6" />
          Marketplace
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover and fork published agents and clusters from the community
        </p>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search marketplace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "agent", "cluster"] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {t === "all" ? "All" : t === "agent" ? "Agents" : "Clusters"}
            </Button>
          ))}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="cursor-default">
              {cat}
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <ApiError message={error} onRetry={loadData} />
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            {search ? "No listings match your search." : "No published agents or clusters yet."}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Publish your agents from their detail page to share them here.
          </p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" /> Featured
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featured.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onFork={() => setForkDialog(listing)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onFork={() => setForkDialog(listing)}
              />
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      <Dialog open={!!forkDialog} onOpenChange={() => setForkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fork to Your Workspace</DialogTitle>
            <DialogDescription>
              This will create a new {forkDialog?.entity_type} in your workspace based on &quot;{forkDialog?.name}&quot;.
              You can customize it after forking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForkDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => forkDialog && handleFork(forkDialog)}
              disabled={forkingId === forkDialog?.id}
            >
              {forkingId === forkDialog?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <GitFork className="h-4 w-4 mr-2" />
              )}
              Fork
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListingCard({
  listing,
  onFork,
}: {
  listing: Listing;
  onFork: () => void;
}) {
  const avgRating =
    listing.rating_count > 0
      ? (listing.rating_sum / listing.rating_count).toFixed(1)
      : null;

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {listing.entity_type === "agent" ? (
              <Bot className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Network className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base">{listing.name}</CardTitle>
          </div>
          {listing.is_featured && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {listing.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {listing.description}
          </p>
        )}
        <div className="flex gap-1 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {listing.entity_type}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {listing.category}
          </Badge>
          {listing.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              {listing.use_count}
            </span>
            {avgRating && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {avgRating}
              </span>
            )}
          </div>
          <Button size="sm" onClick={onFork}>
            <GitFork className="h-3.5 w-3.5 mr-1.5" />
            Fork
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
