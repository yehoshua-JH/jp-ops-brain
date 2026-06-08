import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function SessionLibrary() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Session Library</h1>
        <p className="text-muted-foreground mt-2">
          Browse all processed sessions with full search and filtering capabilities.
        </p>
      </div>

      <Card className="p-6">
        <Input
          placeholder="Search sessions by date, type, or domain..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-6"
        />

        <div className="text-center py-12 text-muted-foreground">
          No sessions yet. Process your first meeting to get started.
        </div>
      </Card>
    </div>
  );
}
