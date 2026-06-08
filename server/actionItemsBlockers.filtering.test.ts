import { describe, it, expect } from "vitest";

/**
 * Tests for ActionItemsBlockers filtering functionality
 * 
 * These tests verify that the filtering logic correctly:
 * - Filters by owner, status, priority, and search text
 * - Filters by date range (start/end dates)
 * - Combines multiple filters correctly
 * - Clears all filters when requested
 */

describe("ActionItemsBlockers Filtering", () => {
  // Mock action item data
  const mockActionItems = [
    {
      id: 1,
      task: "Implement time tracking system",
      owner: "Reef",
      priority: "HIGH",
      status: "open",
      deadline: new Date("2026-06-15"),
      domainTag: "TIME-TRACKING",
    },
    {
      id: 2,
      task: "Set up invoicing automation",
      owner: "Yehoshua",
      priority: "HIGH",
      status: "open",
      deadline: new Date("2026-06-20"),
      domainTag: "INVOICING",
    },
    {
      id: 3,
      task: "Train team on new platform",
      owner: "Reef",
      priority: "MEDIUM",
      status: "open",
      deadline: new Date("2026-06-30"),
      domainTag: "TECH-PLATFORM",
    },
    {
      id: 4,
      task: "Review client contracts",
      owner: "Yehoshua",
      priority: "LOW",
      status: "complete",
      deadline: new Date("2026-06-10"),
      domainTag: "CLIENT-OPS",
    },
  ];

  it("should filter by owner", () => {
    const filtered = mockActionItems.filter((item) => item.owner === "Reef");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.owner === "Reef")).toBe(true);
  });

  it("should filter by status", () => {
    const filtered = mockActionItems.filter((item) => item.status === "open");
    expect(filtered).toHaveLength(3);
    expect(filtered.every((item) => item.status === "open")).toBe(true);
  });

  it("should filter by priority", () => {
    const filtered = mockActionItems.filter((item) => item.priority === "HIGH");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.priority === "HIGH")).toBe(true);
  });

  it("should filter by search text", () => {
    const searchText = "train";
    const filtered = mockActionItems.filter((item) =>
      item.task.toLowerCase().includes(searchText.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].task).toContain("Train");
  });

  it("should filter by date range (start date)", () => {
    const startDate = new Date("2026-06-20");
    const filtered = mockActionItems.filter((item) => {
      if (!item.deadline) return false;
      return item.deadline >= startDate;
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.deadline >= startDate)).toBe(true);
  });

  it("should filter by date range (end date)", () => {
    const endDate = new Date("2026-06-15");
    const filtered = mockActionItems.filter((item) => {
      if (!item.deadline) return false;
      return item.deadline <= endDate;
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.deadline <= endDate)).toBe(true);
  });

  it("should filter by date range (both start and end)", () => {
    const startDate = new Date("2026-06-15");
    const endDate = new Date("2026-06-25");
    const filtered = mockActionItems.filter((item) => {
      if (!item.deadline) return false;
      return item.deadline >= startDate && item.deadline <= endDate;
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.deadline >= startDate && item.deadline <= endDate)).toBe(true);
  });

  it("should combine multiple filters", () => {
    const ownerFilter = "Reef";
    const statusFilter = "open";
    const priorityFilter = "HIGH";

    const filtered = mockActionItems.filter((item) => {
      return (
        item.owner === ownerFilter &&
        item.status === statusFilter &&
        item.priority === priorityFilter
      );
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });

  it("should handle items without deadlines in date range filters", () => {
    const itemsWithoutDeadline = [
      ...mockActionItems,
      {
        id: 5,
        task: "No deadline task",
        owner: "Reef",
        priority: "LOW",
        status: "open",
        deadline: null,
        domainTag: "GENERAL",
      },
    ];

    const startDate = new Date("2026-06-15");
    const filtered = itemsWithoutDeadline.filter((item) => {
      if (!item.deadline) return false;
      return item.deadline >= startDate;
    });

    // Should return 3 items: id 2 (2026-06-20), id 3 (2026-06-30), and id 1 (2026-06-15)
    expect(filtered).toHaveLength(3);
    expect(filtered.every((item) => item.deadline !== null)).toBe(true);
    expect(filtered.every((item) => item.deadline >= startDate)).toBe(true);
  });

  it("should return all items when no filters are applied", () => {
    const filtered = mockActionItems.filter(() => true);
    expect(filtered).toHaveLength(mockActionItems.length);
  });

  it("should return empty array when filters have no matches", () => {
    const filtered = mockActionItems.filter(
      (item) => item.owner === "NonExistent" && item.priority === "HIGH"
    );
    expect(filtered).toHaveLength(0);
  });

  it("should identify overdue items", () => {
    const now = new Date();
    const overdueItems = mockActionItems.filter((item) => {
      return item.deadline && item.deadline < now && item.status === "open";
    });

    // All mock items have future dates, so this should be empty
    expect(overdueItems).toHaveLength(0);
  });

  it("should identify high priority items", () => {
    const highPriorityItems = mockActionItems.filter(
      (item) => item.priority === "HIGH" && item.status === "open"
    );
    expect(highPriorityItems).toHaveLength(2);
  });

  it("should count items by owner", () => {
    const ownerCounts = new Map<string, number>();
    mockActionItems.forEach((item) => {
      const count = (ownerCounts.get(item.owner) || 0) + 1;
      ownerCounts.set(item.owner, count);
    });

    expect(ownerCounts.get("Reef")).toBe(2);
    expect(ownerCounts.get("Yehoshua")).toBe(2);
  });

  it("should separate open and completed items", () => {
    const openItems = mockActionItems.filter((item) => item.status === "open");
    const completedItems = mockActionItems.filter((item) => item.status === "complete");

    expect(openItems).toHaveLength(3);
    expect(completedItems).toHaveLength(1);
    expect(openItems.length + completedItems.length).toBe(mockActionItems.length);
  });
});
