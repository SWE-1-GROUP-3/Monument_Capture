import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MonumentActions } from "./MonumentActions";

vi.mock("react-native", () => vi.importActual("react-native-web"));
afterEach(cleanup);

it("places a small details link above a filled, disabled capture button, both with 44px targets", () => {
  const onViewDetails = vi.fn();
  const { container } = render(<MonumentActions available onViewDetails={onViewDetails} />);
  const details = screen.getByRole("link", { name: "View details" });
  expect(details.textContent).toBe("View details →");
  expect(getComputedStyle(details).minHeight).toBe("44px");
  const start = screen.getByRole("button", { name: "Start Capture" });
  expect(getComputedStyle(start).minHeight).toBe("44px");
  expect(getComputedStyle(start).backgroundColor).toBe("rgb(23, 107, 71)");
  expect(getComputedStyle(start).width).toBe("100%");
  expect(details.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(start.getAttribute("aria-disabled")).toBe("true");
  expect(getComputedStyle(start).opacity).toBe("0.5");
  fireEvent.click(start);
  expect(onViewDetails).not.toHaveBeenCalled();
  fireEvent.click(details);
  expect(onViewDetails).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Proximity integration is pending.")).toBeNull();
  expect(container.textContent).toBe("View details →Start Capture");
});

it("keeps only the details link when unavailable", () => {
  render(<MonumentActions available={false} onViewDetails={() => {}} />);
  expect(screen.getByRole("link", { name: "View details" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start Capture" })).toBeNull();
});
