import { createError } from 'h3'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

interface BrowserBundle {
  chromiumLauncher: any
  launchOptions: Record<string, any>
}

function normalizePath(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  return trimmed.replace(/^"(.*)"$/, '$1')
}

function fileExists(path: string | undefined): path is string {
  if (!path) return false
  return existsSync(path)
}

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  )
}

function resolveLocalBrowserExecutablePath(): string | undefined {
  const envPath = normalizePath(process.env.CHROME_EXECUTABLE_PATH)
  if (fileExists(envPath)) {
    return envPath
  }

  const candidates: string[] = []

  if (process.platform === 'win32') {
    const programFiles = normalizePath(process.env.PROGRAMFILES)
    const programFilesX86 = normalizePath(process.env['PROGRAMFILES(X86)'])
    const localAppData = normalizePath(process.env.LOCALAPPDATA)

    const roots = [programFiles, programFilesX86, localAppData].filter((value): value is string => !!value)

    for (const root of roots) {
      candidates.push(join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'))
      candidates.push(join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
      candidates.push(join(root, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'))
    }

    // Fallback fixo para ambientes onde ProgramFiles nao vem no process.env.
    candidates.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    candidates.push('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
    candidates.push('C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe')
    candidates.push('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
    candidates.push('C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe')
    candidates.push('C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe')
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    candidates.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')
    candidates.push('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser')
  } else {
    candidates.push('/usr/bin/google-chrome-stable')
    candidates.push('/usr/bin/google-chrome')
    candidates.push('/usr/bin/chromium-browser')
    candidates.push('/usr/bin/chromium')
    candidates.push('/snap/bin/chromium')
  }

  return candidates.find((candidate) => fileExists(candidate))
}

async function resolveServerlessLaunchOptions(): Promise<Record<string, any>> {
  const chromiumPack = await import('@sparticuz/chromium')
  const chromiumRuntime = chromiumPack.default

  const launchOptions: Record<string, any> = {
    headless: true,
    args: chromiumRuntime.args
  }

  try {
    const executablePath = normalizePath(await chromiumRuntime.executablePath())
    if (fileExists(executablePath)) {
      launchOptions.executablePath = executablePath
      return launchOptions
    }
  } catch {
    // fallback para navegadores locais quando estiver em runtime nao padrao
  }

  const fallbackExecutable = resolveLocalBrowserExecutablePath()
  if (fallbackExecutable) {
    launchOptions.executablePath = fallbackExecutable
  }

  return launchOptions
}

async function resolveBrowserBundle(): Promise<BrowserBundle> {
  const { chromium } = await import('playwright-core')
  const serverless = isServerlessRuntime()
  const launchOptions: Record<string, any> = serverless
    ? await resolveServerlessLaunchOptions()
    : { headless: true }

  if (serverless && !launchOptions.executablePath) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Nao foi encontrado executavel de Chromium no runtime. Verifique a dependencia @sparticuz/chromium ou configure CHROME_EXECUTABLE_PATH.'
    })
  }

  if (!serverless) {
    const executablePath = resolveLocalBrowserExecutablePath()
    if (executablePath) {
      launchOptions.executablePath = executablePath
    } else {
      // Fallback: deixa o Playwright tentar Chrome/Edge por channel.
      launchOptions.channel = 'chrome'
    }
  }

  return {
    chromiumLauncher: chromium,
    launchOptions
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message?.trim()) {
    return error.message.trim()
  }
  return 'Falha desconhecida ao iniciar navegador para gerar PDF.'
}

async function launchBrowserWithFallback(chromiumLauncher: any, launchOptions: Record<string, any>) {
  const attempts: Record<string, any>[] = [launchOptions]

  if (!launchOptions.executablePath) {
    if (launchOptions.channel !== 'chrome') {
      attempts.push({ ...launchOptions, channel: 'chrome' })
    }

    if (launchOptions.channel !== 'msedge') {
      attempts.push({ ...launchOptions, channel: 'msedge' })
    }
  }

  let lastError: unknown

  for (const options of attempts) {
    try {
      return await chromiumLauncher.launch(options)
    } catch (error) {
      lastError = error
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: `Falha ao iniciar navegador para gerar PDF. ${getErrorMessage(lastError)}`
  })
}

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  if (!html || !html.trim()) {
    throw createError({
      statusCode: 500,
      statusMessage: 'HTML vazio para gerar PDF.'
    })
  }

  const { chromiumLauncher, launchOptions } = await resolveBrowserBundle()

  const browser = await launchBrowserWithFallback(chromiumLauncher, launchOptions)

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1600,
        height: 1000
      }
    })

    await page.setContent(html, {
      waitUntil: 'networkidle'
    })

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm'
      }
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
