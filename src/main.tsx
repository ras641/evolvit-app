import './createPost.js';

import { Devvit, useState, useWebView } from '@devvit/public-api';
import type { JSONValue } from '@devvit/public-api';

//import { Devvit } from '@devvit/public-api';

import type { DevvitMessage, WebViewMessage } from './message.js';


Devvit.configure({
  redditAPI: true,
  redis: true,
  http:true,
  media: true
});



Devvit.addCustomPostType({
  name: 'Say Hello',
  render: () => {
    const [counter, setCounter] = useState(0);

    const [data] = useState(async () => {
      try {
        const res = await fetch('https://presentr.ai/evolvit/getstate?x=0&y=0');
        const full = await res.json();

        if (full.status === 'pending') {
          return { pending: true } as JSONValue;
        }

        return {
          state: full.state ?? { creatures: [], food: [] },
          frame: full.frame ?? 0,
          deltas: full.deltas ?? {},
          sprites: full.sprites ?? {}
        } as JSONValue;
      } catch {
        return { error: 'Failed to fetch simulation data' } as JSONValue;
      }
    });

    const webView = useWebView({
      url: 'page.html',
      onMessage: async (message, webView) => {
        switch (message.type) {
          case 'webViewReady':
          case 'requestUpdate': {
            try {
              const res = await fetch('https://presentr.ai/evolvit/getstate?x=0&y=0');
              const full = await res.json();

              if (full.status === 'pending') {
                webView.postMessage({
                  type: 'error',
                  data: { message: '⏳ Simulation not ready yet' }
                });
                return;
              }

              webView.postMessage({
                type: 'stateUpdate',
                data: {
                  state: full.state,
                  frame: full.frame,
                  deltas: full.deltas,
                  sprites: full.sprites
                }
              });
            } catch {
              webView.postMessage({
                type: 'error',
                data: { message: '❌ Failed to fetch simulation data' }
              });
            }
            break;
          }

          default:
            throw new Error(`Unknown message type: ${message satisfies never}`);
        }
      }
    });

    const isReady =
      (data as any)?.state &&
      (data as any)?.frame !== undefined &&
      !(data as any)?.pending &&
      !(data as any)?.error;

    return (
      <vstack alignment="top" height="100%" gap="small">
        <text size="xxlarge" weight="bold">Hello! 👋</text>
        <text size="xxlarge" weight="bold">Welcome to</text>
        <text size="xxlarge" weight="bold">🧬 Evolvit creature simulator🧬 </text>

        {(data as any)?.error ? (
          <text color="red">❌ {(data as any).error}</text>
        ) : (data as any)?.pending ? (
          <text color="yellow">⏳ Simulation is starting...</text>
        ) : (
          <>
            <text>🧬 Creatures: {(data as any).state.creatures.length}</text>
            <text>🍎 Food: {(data as any).state.food.length}</text>
            <text>🎨 Sprites: {Object.keys((data as any).sprites ?? {}).length}</text>
            <text>🖼️ Frame: {(data as any).frame}</text>
            <text>📐 Deltas: {Object.keys((data as any).deltas ?? {}).length}</text>
          </>
        )}

        <button onPress={() => webView.mount()} disabled={!isReady}>
          Launch App
        </button>

      </vstack>
    );
  }
});


/*

Devvit.addMenuItem({
  label: 'Check Simulation State',
  location: 'post',
  onPress: async (event, context) => {
    const res = await fetch('https://presentr.ai/evolvit/getstate?x=0&y=0');
    const data = await res.json();

    const creatures = data.creatures?.length ?? 0;
    const food = data.food?.length ?? 0;

    context.ui.showToast(`${creatures} creatures, ${food} food`);
  },
});

Devvit.addMenuItem({
  label: 'Say Hello',
  location: 'post',
  onPress: async (_event, context) => {
    context.ui.showToast('👋 Hello from Devvit!');
  }
});

*/

export default Devvit;
