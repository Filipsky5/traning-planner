import { expect, test } from "@playwright/test";

const authPages = [
  { path: "/login", title: "Zaloguj się" },
  { path: "/register", title: "Utwórz konto" },
  { path: "/forgot-password", title: "Zapomniałeś hasła?" },
  { path: "/reset-password?token=smoke-test", title: "Ustaw nowe hasło" },
];

for (const { path, title } of authPages) {
  test(`hydrates ${path} without browser errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(path);
    await expect(page.locator("[data-slot=card-title]")).toHaveText(title);
    await expect(page.locator("form input").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("keeps protected pages behind login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-email-input")).toBeVisible();
});

test("validates a short password locally without attempting login", async ({ page }) => {
  let loginRequests = 0;
  await page.route("**/api/v1/auth/login", async (route) => {
    loginRequests++;
    await route.abort();
  });

  await page.goto("/login");
  await page.getByTestId("login-email-input").fill("runner@example.com");
  await page.getByTestId("login-password-input").fill("short");
  await page.getByTestId("login-submit-button").click();

  await expect(page.getByText("Hasło musi mieć minimum 8 znaków", { exact: true })).toBeVisible();
  expect(loginRequests).toBe(0);
});

test("returns the validation error contract for a missing email", async ({ request }) => {
  const response = await request.post("/api/v1/auth/login", { data: { password: "Runner123" } });

  expect(response.status()).toBe(422);
  expect(await response.json()).toMatchObject({
    error: { code: "validation_error", message: "Email jest wymagany" },
  });
});
