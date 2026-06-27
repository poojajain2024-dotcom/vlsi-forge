import { render } from "@testing-library/react-native";

import App from "../App";

describe("App", () => {
  it("renders home label", () => {
    const { getByText } = render(<App />);
    expect(getByText("VLSI Learning")).toBeTruthy();
  });
});
