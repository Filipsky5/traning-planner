import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Login Page
 * Provides methods for interacting with login page elements
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.submitButton = page.getByTestId('login-submit-button');
    this.errorMessage = page.getByTestId('login-error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    // Wait for inputs to be ready before filling
    await this.emailInput.waitFor({ state: 'visible' });
    await this.emailInput.clear();
    await this.emailInput.fill(email);

    // Small delay between email and password fields
    await this.page.waitForTimeout(100);

    await this.passwordInput.waitFor({ state: 'visible' });
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);

    // Small delay to let React validation settle before submit
    await this.page.waitForTimeout(300);

    await this.submitButton.click();
  }

  async waitForNavigation() {
    await this.page.waitForURL(/\/(onboarding|$)/);
  }
}
