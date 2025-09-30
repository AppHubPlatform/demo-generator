// This file handles LogRocket initialization in the page context
(() => {
  console.info('[LogRocket] Activating via load-logrocket.js');

  // Get parameters from URL query string
  const urlParams = new URLSearchParams(
    document.currentScript ? document.currentScript.src.split('?')[1] : window.location.search
  );

  // Extract configuration from URL parameters
  const scriptSrc = urlParams.get('scriptSrc') || 'https://cdn.lgrckt-in.com/LogRocket.min.js';
  const asyncScriptSrc = urlParams.get('asyncScriptSrc') || 'https://cdn.lgrckt-in.com/logger.min.js';
  const serverURL = urlParams.get('serverURL') || 'https://staging-i.logrocket.io/i';
  const dashboardHost = urlParams.get('dashboardHost') || 'https://staging.logrocket.com';
  const appID = urlParams.get('appID') || 'apphub/infinite-monkeys';
  const shouldAutoIdentify = urlParams.get('autoIdentify') === 'true';
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
  asyncShim.textContent = `window._lrAsyncScript = '${decodeURIComponent(asyncScriptSrc)}';`;
  headElement.insertBefore(asyncShim, headElement.firstChild);

  // Then load the main script
  loadMainScript();
})();
