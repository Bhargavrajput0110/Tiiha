const { test, expect } = require('@playwright/test');

test('Critical Path: Browse -> Select Size -> Add to Cart -> Checkout', async ({ page }) => {
  // 1. Navigate to Homepage
  await page.goto('/');
  await expect(page).toHaveTitle(/Tiiha/);

  // 2. Click "Shop the Edit" in the hero section
  const shopBtn = page.getByRole('button', { name: /shop the edit/i }).first();
  await shopBtn.waitFor({ state: 'visible' });
  await shopBtn.click();

  // 3. Wait for Shop page to render by looking for product cards
  await page.waitForTimeout(1000); // Wait for React state transition

  // Click the specific product by text
  const firstProduct = page.getByText('Mustard Glow Suit Set').first();
  await firstProduct.waitFor({ state: 'visible' });
  await firstProduct.click();

  // Wait for the Product Modal to open by looking for the "Select Size" text
  await expect(page.getByText(/Select Size/i)).toBeVisible();

  // 4. Select a size (e.g. 'M')
  const sizeButton = page.getByRole('button', { name: /^M$/i });
  await sizeButton.waitFor({ state: 'visible' });
  await sizeButton.click();

  // Verify the size button is selected (has black background)
  await expect(sizeButton).toHaveClass(/bg-\[#0D0D0D\]/);

  // 5. Click "Add to Bag"
  const addToBagBtn = page.getByRole('button', { name: /add to bag/i });
  await addToBagBtn.click();

  // Verify that the cart badge updates (usually indicates "1")
  // The cart button is in the top right.
  const cartBadge = page.getByText('Bag').locator('..').locator('span').first();
  await expect(cartBadge).toHaveText('1');

  // Open Cart
  await cartBadge.click();

  // Verify cart sidebar is visible and contains the checkout button
  const checkoutBtn = page.getByRole('button', { name: /checkout/i });
  await expect(checkoutBtn).toBeVisible();
});
