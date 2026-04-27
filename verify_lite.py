from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(1000)

    # Take screenshot at the dashboard
    page.screenshot(path="/home/jules/verification/screenshots/verification-lite.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.set_viewport_size({'width': 1280, 'height': 720})
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
