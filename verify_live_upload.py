import os
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print("Navigating to Vercel production app...")
        await page.goto("https://boo-k-bridg-e-indi-a.vercel.app/login")

        print("Logging in...")
        await page.fill('input[type="email"]', "test@example.com")
        await page.fill('input[type="password"]', "password")
        await page.click('button[type="submit"]')

        # Wait for redirect
        await page.wait_for_url("https://boo-k-bridg-e-indi-a.vercel.app/")
        print("Logged in successfully.")

        print("Navigating to Sell page...")
        await page.goto("https://boo-k-bridg-e-indi-a.vercel.app/sell")
        await page.wait_for_selector('input[placeholder="Book Title"]')

        print("Filling out book details...")
        await page.fill('input[placeholder="Book Title"]', "Live Prod Test Book")
        await page.fill('input[placeholder="Author Name"]', "E2E Tester")
        await page.fill('input[placeholder="Price (₹)"]', "499")
        
        print("Uploading test image...")
        # Playwright file upload - we need the input file element
        # The frontend component is ImageUpload.jsx which has <input type="file" ... data-testid="sell-image-file-input">
        file_input = page.locator('input[type="file"]')
        await file_input.set_input_files("test_image.jpg")
        
        # Wait for the canvas processing to finish and image to appear
        # The button should change to "Change"
        await page.wait_for_selector('button:has-text("Change")')

        print("Submitting the book...")
        # The submit button is "Publish Listing"
        await page.click('button:has-text("Publish Listing")')

        # Wait for success toast or redirect to /books/...
        print("Waiting for submission to complete...")
        await page.wait_for_timeout(3000) # Give it some time for API call and redirect
        
        print("Going to marketplace to verify...")
        await page.goto("https://boo-k-bridg-e-indi-a.vercel.app/")
        
        # Wait for books to load
        await page.wait_for_selector('text="Live Prod Test Book"')
        print("Found the book on the marketplace!")
        
        # Find the image of the book
        # The DOM structure is typically a card with an img inside
        card = page.locator('text="Live Prod Test Book"').locator("xpath=ancestor::*[contains(@class, 'group') or contains(@class, 'rounded-2xl') or contains(@class, 'card')]").first
        
        img = card.locator('img')
        img_src = await img.get_attribute('src')
        
        print(f"Book Image SRC: {img_src}")
        
        if img_src and "res.cloudinary.com" in img_src:
            print("SUCCESS! Cloudinary image is displayed on Production.")
        else:
            print(f"FAILED! Image SRC does not match Cloudinary: {img_src}")

        await page.screenshot(path="e2e_prod_marketplace.png")
        print("Screenshot saved to e2e_prod_marketplace.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
