import createDOMPurify from 'dompurify'

const domPurify = typeof window !== 'undefined' ? createDOMPurify(window) : null

export function sanitizeHTML(value: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    return ''
  }

  if (!domPurify) {
    return value
  }

  return domPurify.sanitize(value, {
    USE_PROFILES: { html: true }
  }) as string
}

export function sanitizeText(value: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    return ''
  }

  if (!domPurify) {
    return value
  }

  return domPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }) as string
}

