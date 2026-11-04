import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import QueueScreen from "../../app/(tabs)/queue";
import ReviewScreen from "../../app/review/[id]";
import { createMockState } from "./mockData";
import { __setReviewStateForTests, getReviewState } from "./reviewStore";

const route = vi.hoisted(() => ({ id: "c-1", push: vi.fn(), replace: vi.fn(), back: vi.fn(), canGoBack: vi.fn(() => true) }));
vi.mock("react-native", () => vi.importActual("react-native-web"));
vi.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
vi.mock("../components/Screen", () => ({ Screen: ({ children, title }: PropsWithChildren<{ title: string }>) => <div><h1>{title}</h1>{children}</div> }));
vi.mock("expo-router", () => ({ router: route, useLocalSearchParams: () => ({ id: route.id }) }));

beforeEach(() => {
  __setReviewStateForTests(createMockState(Date.now()));
  route.id = "c-1";
  route.replace.mockClear();
});
afterEach(cleanup);

const asUser = (id: string) => __setReviewStateForTests({ ...getReviewState(), currentUserId: id });

it("US-13: a player is denied access to the moderation queue", () => {
  asUser("u-alex");
  render(<QueueScreen />);
  expect(screen.getByText("Access denied")).toBeTruthy();
  expect(screen.queryByText("Bethesda Fountain")).toBeNull();
});

it("US-13: a moderator sees the pending captures", () => {
  asUser("u-morgan");
  render(<QueueScreen />);
  expect(screen.getByText("Bethesda Fountain")).toBeTruthy();
  expect(screen.getByText("General Grant National Memorial")).toBeTruthy();
});

it("US-14: a player viewing a pending capture gets no approve or reject options", () => {
  asUser("u-alex");
  render(<ReviewScreen />);
  expect(screen.queryByText("Approve")).toBeNull();
  expect(screen.queryByText("Reject")).toBeNull();
  expect(screen.getByText("Only moderators can approve or reject captures.")).toBeTruthy();
});

it("US-14: rejecting without a reason shows an error and records nothing", () => {
  asUser("u-morgan");
  render(<ReviewScreen />);
  fireEvent.click(screen.getByText("Reject"));
  expect(screen.getByText("A reason is required to reject a capture.")).toBeTruthy();
  expect(getReviewState().captures.find((c) => c.id === "c-1")?.status).toBe("pending");
});

it("US-14: approving records the decision and moves to the next capture", () => {
  asUser("u-morgan");
  render(<ReviewScreen />);
  fireEvent.click(screen.getByText("Approve"));
  expect(getReviewState().captures.find((c) => c.id === "c-1")?.status).toBe("approved");
  expect(route.replace).toHaveBeenCalledWith("/review/c-2");
});
