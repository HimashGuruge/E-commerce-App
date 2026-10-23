import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import Card from "./Card.jsx";

const renderCard = (props = {}) =>
  render(
    <MemoryRouter>
      <Card
        productId="p-1"
        productName="Test Shirt"
        price={1234}
        stock={1}
        images={[]}
        {...props}
      />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe("Card component", () => {
  it("renders the product name", () => {
    renderCard();
    expect(screen.getByText("Test Shirt")).toBeInTheDocument();
  });

  it("formats the price with thousand separators", () => {
    renderCard();
    expect(screen.getByText(/Rs\. 1,234/)).toBeInTheDocument();
  });

  it("shows the sale badge and the old strikethrough price", () => {
    renderCard({ isSale: true, sellingPrice: 800, oldPrice: 1000 });
    expect(screen.getByText("-20%")).toBeInTheDocument();
    expect(screen.getByText(/Rs\. 800/)).toBeInTheDocument();
    expect(screen.getByText(/Rs\. 1,000/)).toBeInTheDocument();
  });

  it("shows the out-of-stock overlay when stock is 0", () => {
    renderCard({ stock: 0 });
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  it("shows the rating row and review count", () => {
    renderCard({ rating: 4, reviewCount: 2 });
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("toggles the product into localStorage wishlist for logged-out users", () => {
    renderCard();
    const heart = screen.getByRole("button");

    fireEvent.click(heart);
    expect(JSON.parse(localStorage.getItem("myWishlist"))).toEqual([
      expect.objectContaining({ productId: "p-1" }),
    ]);

    fireEvent.click(heart);
    expect(JSON.parse(localStorage.getItem("myWishlist"))).toEqual([]);
  });
});
