import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { errorTracker } from './lib/errorTracking'

// Set up global error handlers for unhandled errors
window.addEventListener('error', (event) => {
  errorTracker.captureException(event.error || event.message, {
    type: 'unhandled_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorTracker.captureException(event.reason, {
    type: 'unhandled_promise_rejection',
    reason: event.reason,
  });
});

createRoot(document.getElementById("root")!).render(<App />);
