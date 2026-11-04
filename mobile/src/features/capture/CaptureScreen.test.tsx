import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";

import CaptureScreen from "../../../app/(tabs)/capture";

vi.mock("react-native", () => vi.importActual("react-native-web"));
vi.mock("@expo/vector-icons", () => ({ Ionicons: () => <span /> }));
vi.mock("../../components/Screen", () => ({
  Screen: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./useCaptureEligibility", () => ({
  useCaptureEligibility: () => ({
    state: {
      status: "eligible",
      message: "Location verified. You are about 10 m from the monument.",
      distanceMeters: 10,
    },
    verify: vi.fn(),
    reset: vi.fn(),
  }),
}));

afterEach(cleanup);

it("continues to a visible monument photo step on Web", () => {
  render(<CaptureScreen />);

  fireEvent.click(screen.getByRole("button", { name: "Continue to monument photo" }));

  expect(screen.getByText("Monument photo step")).toBeTruthy();
  expect(screen.getByText(/Camera capture and photo submission/)).toBeTruthy();
});
