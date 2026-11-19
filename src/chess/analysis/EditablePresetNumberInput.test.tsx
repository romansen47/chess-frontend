// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import EditablePresetNumberInput from "./EditablePresetNumberInput";

afterEach(cleanup);

function TestInput() {
  const [value, setValue] = useState(5);
  return (
    <EditablePresetNumberInput
      value={value}
      presets={[1, 2, 3, 5, 10]}
      suffix="s"
      onChange={setValue}
    />
  );
}

describe("EditablePresetNumberInput", () => {
  it("accepts a positive integer outside the presets", () => {
    render(<TestInput />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "6" } });

    expect((input as HTMLInputElement).value).toBe("6");
  });

  it("restores the last valid value after invalid input", () => {
    render(<TestInput />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "6" } });
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);

    expect((input as HTMLInputElement).value).toBe("6");
  });
});
