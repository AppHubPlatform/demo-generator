// Inline LogRocket loader script to avoid file system issues in production

type LogRocketServer = 'demo' | 'staging' | 'prod';

interface LogRocketConfig {
  serverURL: string;
  dashboardHost: string;
}

function getLogRocketConfig(server: LogRocketServer): LogRocketConfig {
  switch (server) {
    case 'staging':
      return {
        serverURL: 'https://staging-i.logrocket.io/i',
        dashboardHost: 'https://staging.logrocket.com'
      };
    case 'demo':
      return {
        serverURL: 'https://demo.logrocket.com/i',
        dashboardHost: 'https://demo.logrocket.com'
      };
    case 'prod':
    default:
      return {
        serverURL: 'https://r.lgrckt-in.com/i',
        dashboardHost: 'https://app.logrocket.com'
      };
  }
}

export function generateLogRocketScript(server: LogRocketServer = 'prod', appID: string = 'public-shares/credit-karma'): string {
  const config = getLogRocketConfig(server);

  return `
// This file handles LogRocket initialization in the page context
(() => {
  console.info('[LogRocket] Activating via load-logrocket.js');

  // Check if we're on google.com - don't record Google pages
  if (window.location.hostname.includes('google.com')) {
    console.info('[LogRocket] Skipping initialization on google.com');
    return;
  }

  // Get parameters from URL query string
  const urlParams = new URLSearchParams(
    document.currentScript ? document.currentScript.src.split('?')[1] : window.location.search
  );

  // Extract configuration from URL parameters
  const scriptSrc = urlParams.get('scriptSrc') || 'https://cdn.lgrckt-in.com/LogRocket.min.js';
  const asyncScriptSrc = urlParams.get('asyncScriptSrc') || 'https://cdn.lgrckt-in.com/logger.min.js';
  const serverURL = urlParams.get('serverURL') || '${config.serverURL}';
  const dashboardHost = urlParams.get('dashboardHost') || '${config.dashboardHost}';
  const appID = urlParams.get('appID') || '${appID}';
  const shouldAutoIdentify = urlParams.get('autoIdentify') === 'false';
  const shouldAutoSanitizeInput = urlParams.get('autoSanitizeInput') === 'true';
  const shouldAutoSanitizeText = urlParams.get('autoSanitizeText') === 'true';
  const shouldAutoRedux = urlParams.get('autoRedux') === 'true';

  const headElement = document.head || document.documentElement;

  function loadMainScript() {
    const s = document.createElement('script');
    s.src = decodeURIComponent(scriptSrc);

    s.onload = function onload() {
      // Remove the script tag once it has been loaded.
      this.remove();

      // Define window.logInfo helper
      window.logInfo = typeof console !== 'undefined' && console.info.bind ? console.info.bind(console) : () => {};

      // Build LogRocket options
      const opts = {
        uploadTimeInterval: 3000,
        dom: {
          assetCapture: {
            isDisabled: false,
          },
        },
      };

      // Add server URL if provided
      if (serverURL) {
        opts.serverURL = decodeURIComponent(serverURL);
      }

      // Add dashboard host if provided
      if (dashboardHost) {
        opts.dashboardHost = decodeURIComponent(dashboardHost);
      }

      // Add input sanitization if enabled
      if (shouldAutoSanitizeInput) {
        opts.dom.inputSanitizer = true;
      }

      // Add text sanitization if enabled
      if (shouldAutoSanitizeText) {
        opts.dom.textSanitizer = true;
      }


      // disable console logging in LogRocket and then manually log all non browserstack events

      opts.console = { isEnabled: false };

      // Override console methods to filter out Browserbase logs
      const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
      };

      const filterBrowserStack = (args) => {
        const message = args.join(' ');
        return !message.toLowerCase().includes('browserbase');
      };

      console.log = (...args) => {
        if (filterBrowserStack(args)) {
          originalConsole.log(...args);
          window.LogRocket.log(args.join(' '), 'log');
        }
      };

      console.info = (...args) => {
        if (filterBrowserStack(args)) {
          originalConsole.info(...args);
          window.LogRocket.log(args.join(' '), 'info');
        }
      };

      console.warn = (...args) => {
        if (filterBrowserStack(args)) {
          originalConsole.warn(...args);
          window.LogRocket.log(args.join(' '), 'warn');
        }
      };

      console.error = (...args) => {
        if (filterBrowserStack(args)) {
          originalConsole.error(...args);
          window.LogRocket.log(args.join(' '), 'error');
        }
      };

      window.logInfo('[LogRocket] Initializing with options', opts);
      window.LogRocket.init(decodeURIComponent(appID), opts);

      // Auto identify if enabled
      if (shouldAutoIdentify) {
        window.LogRocket.identify('1234', {
          name: 'Ben Edelstein',
          email: 'ben@logrocket.com',
        });
      }

      // Auto Redux if enabled
      if (shouldAutoRedux) {
        // Implementation of auto Redux (simplified)
        window.logInfo('[LogRocket] automatic fake redux actions initialized');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/redux@4.0.1/dist/redux.js';
        script.onload = () => {
          const { createStore, combineReducers, applyMiddleware } = window.Redux;

          // actions
          const INCREMENT_COUNTER = 'INCREMENT_COUNTER';
          const DECREMENT_COUNTER = 'DECREMENT_COUNTER';
          const RESET_COUNTER = 'RESET_COUNTER';
          const actions = [INCREMENT_COUNTER, DECREMENT_COUNTER, RESET_COUNTER];

          // reducers
          const counterState = { value: 10 };
          function counter(state = counterState, action) {
            if (action.type === INCREMENT_COUNTER) {
              return { ...state, value: state.value + 1 };
            } else if (action.type === DECREMENT_COUNTER) {
              return { ...state, value: state.value - 1 };
            } else if (action.type === RESET_COUNTER) {
              return counterState;
            }
            return state;
          }

          const reducers = combineReducers({ counter });

          // store
          const store = createStore(reducers, applyMiddleware(window.LogRocket.reduxMiddleware()));

          // random actions
          const randomInt = (min, max) => min + Math.round(Math.random() * (max - min));
          function triggerReduxAction() {
            const type = actions[randomInt(0, actions.length - 1)];
            store.dispatch({ type });
            setTimeout(triggerReduxAction, randomInt(5000, 10000));
          }

          setTimeout(triggerReduxAction, 1000);
        };
        document.body.appendChild(script);
      }

      window.LogRocket.getSessionURL(url => window.logInfo('[LogRocket] session url', url));
    };

    headElement.insertBefore(s, headElement.firstChild);
  }

  // Set up async script shim first
  const asyncShim = document.createElement('script');
  asyncShim.textContent = \`window._lrAsyncScript = '\${decodeURIComponent(asyncScriptSrc)}';\`;
  headElement.insertBefore(asyncShim, headElement.firstChild);

  // Then load the main script
  loadMainScript();
})();
`;
}

// Backwards compatible default export
export const logRocketScript = generateLogRocketScript('prod');
