import { describe, expect, it } from "vitest";

import { cameraErrorFromDomError } from "./cameraErrors";

const domError = (name: string) => Object.assign(new Error(name), { name });

describe("camera error messages", () => {
  it("maps browser camera failures to the right message", () => {
    expect(cameraErrorFromDomError(domError("NotAllowedError")).code).toBe("denied");
    expect(cameraErrorFromDomError(domError("SecurityError")).code).toBe("denied");
    expect(cameraErrorFromDomError(domError("NotFoundError")).code).toBe("missing");
    expect(cameraErrorFromDomError(domError("NotReadableError")).code).toBe("busy");
    expect(cameraErrorFromDomError(domError("SomethingElse")).code).toBe("unknown");
    expect(cameraErrorFromDomError("not an error").code).toBe("unknown");
  });

  it("explains how to fix a blocked camera", () => {
    expect(cameraErrorFromDomError(domError("NotAllowedError")).message).toContain("Allow camera access");
  });
});
