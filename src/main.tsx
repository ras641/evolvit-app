import './createPost.js';

import { Devvit, useState, useWebView, RedditAPI } from '@devvit/public-api';
import type { JSONValue } from '@devvit/public-api';
import type { DevvitMessage, WebViewMessage } from './message.js';
import type { FormOnSubmitEvent, FormOnSubmitContext } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
  media: true
});

const getUsername = async (context) => {
  const user = await context.reddit.getUserById(context.userId);
  return user.username;
};

type Page = 'home' | 'create' | 'info' | 'specs';

type PageProps = {
  setPage: (page: Page) => void;
};



const TopTabBar = ({ setPage }: PageProps) => (
  <hstack gap="small" alignment="center">
    <button onPress={() => setPage('home')}>🏠 Home</button>
    <button onPress={() => setPage('create')}>🛠️ Create</button>
    <button onPress={() => setPage('info')}>ℹ️ Info</button>
    <button onPress={() => setPage('specs')}>🤓 Specs</button>
    
  </hstack>
);

const HomePage = () => (
  <vstack gap="medium">
    <text size="xxlarge" weight="bold"> 🧬 Evolvit Creature Simulator</text>
    <text>Welcome!</text>
    <text>Use the tabs above to explore.</text>
    <text>Or click below to see the world</text>
  </vstack>
);

const CreatePage = (context) => {
  const [creatureName, setCreatureName] = useState<string | null>(null);
  const [organs, setOrgans] = useState<any[]>([]);

  const nameForm = context.useForm(
    {
      fields: [
        {
          type: 'string',
          name: 'name',
          label: 'Creature Name',
          placeholder: 'e.g., Spikeling',
        },
      ],
    },
    async (values) => {
      const name = values.name?.trim();
      if (!name) return;

      setCreatureName(name); // Save it but don't submit yet
      await context.ui.showToast({ text: `💾 Name set to "${name}"` });
    }
  );

  // Form for adding organs (local state only)
  const organForm = context.useForm(
    {
      title: 'Add Organ',
      fields: [
        {
          type: 'select',
          name: 'type',
          label: 'Organ Type',
          multi: false,
          options: ['mouth', 'flipper', 'eye', 'spike'].map((o) => ({ label: o, value: o })),
          defaultValue: 'mouth'
        },
        {
          type: 'number',
          name: 'size',
          label: 'Size',
          defaultValue: 10,
        },
        {
          type: 'string',
          name: 'x',
          label: 'Position X',
          defaultValue: '20',
          validate: (value) => {
            const n = Number(value);
            return isNaN(n) || n < -50 || n > 50 ? 'Must be a number between -50 and 50' : undefined;
          },
        },
        {
          type: 'string',
          name: 'y',
          label: 'Position Y',
          defaultValue: '20',
          validate: (value) => {
            const n = Number(value);
            return isNaN(n) || n < -50 || n > 50 ? 'Must be a number between -50 and 50' : undefined;
          },
        },
      ],
    },
    async (values) => {
      const type = values.type;
      const size = parseInt(values.size, 10);
      const x = Number(values.x);
      const y = Number(values.y);
  
      if (!type || isNaN(size) || isNaN(x) || isNaN(y)) return;
  
      if (x < -50 || x > 50) {
        context.ui.showToast({ text: '❌ Position X must be between -50 and 50' });
        return;
      }
      if (y < -50 || y > 50) {
        context.ui.showToast({ text: '❌ Position Y must be between -50 and 50' });
        return;
      }

      // Check against body (always at [0, 0], size 8)
      const dxBody = x - 0;
      const dyBody = y - 0;
      const distToBody = Math.sqrt(dxBody * dxBody + dyBody * dyBody);
      if (distToBody < size + 8) {
        context.ui.showToast({ text: '❌ Organ overlaps with the main body (size 8)' });
        return;
      }

      // Check against existing organs
      for (const organ of organs) {
        const [ox, oy] = organ.relative_position;
        const dx = x - ox;
        const dy = y - oy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < size + organ.size) {
          context.ui.showToast({ text: `❌ Overlaps with existing ${organ.type}` });
          return;
        }
      }
  
      setOrgans((prev) => [
        ...prev,
        {
          type,
          size,
          relative_position: [x, y],
        },
      ]);
  
      await context.ui.showToast({ text: `➕ Added ${type}` });
    }
  );

  const submitCreature = async () => {

    if (!creatureName) {
      return;
    }

    const formattedOrgans = organs.map((o) => ({
      type: o.type[0],
      size: o.size,
      position: o.relative_position
    }));

    try {

      const username = await getUsername(context);
      const res = await fetch('https://presentr.ai/evolvit/uploadcreature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: creatureName,
          organs: formattedOrgans,
          creator: username
        }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        // Server returned an error (like 400)
        const errorMsg = data.error || 'Unknown error';
        await context.ui.showToast({ text: `❌ ${errorMsg}` });
        return;
      }
  
      // Successful creation
      const creatureId = data.creature_id;
      await context.ui.showToast({
        text: `✅ Creature "${creatureName}" submitted!\nID: ${creatureId} \n will appear in 10-20 seconds`,
      });
  
      setCreatureName(null);
      setOrgans([]);
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await context.ui.showToast({ text: `❌ Network error: ${message}` });
      console.log(message);
    }
  };

  return (
    <vstack gap="medium">
      <text size="xxlarge" weight="bold"> 🛠️ Create</text>
      <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• Organs can't touch or overlap each other</text>
      <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• Size is always measured by radius)</text>
      <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• The main body is always size 8</text>
      <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• No part of any organ can go outside -50 to 50 in x or y</text>
      <hstack gap="small" alignment="center">
        <button size="small" width="30%" onPress={() => context.ui.showForm(nameForm)}>
          📝 Edit Name
        </button>


        <button size="small" width="30%" onPress={() => context.ui.showForm(organForm)}>
          ➕ Add Organ
        </button>

        <button size="small" width="30%" onPress={submitCreature}>✅ Submit Creature</button>

      </hstack>


      {creatureName && (
        <hstack gap="small">
          <text weight="bold">Name: {creatureName}</text>
        </hstack>
      )}

      {organs.length > 0 && (
        <vstack gap="small">
          <text weight="bold">🧠 Organs:</text>
          {organs.map((o, i) => (
            <text key={i}>
              {o.type} at ({o.relative_position[0]}, {o.relative_position[1]}), size {o.size}
            </text>
          ))}
          
        </vstack>

      )}

      

    </vstack>
  );
};

const InfoPage = () => (
  <vstack gap="medium">
    <text size="xxlarge" weight="bold"> ℹ️ Info</text>
    <text>Think you know what it takes to survive in the harsh, unforgiving Evolvit landscape. Build your creature and see if it can survive or even thrive in a dynamic world</text>
    
  </vstack>
);

const SpecsPage = () => (
  <vstack gap="small">
    <text size="xxlarge" weight="bold"> 🤓 Specifications</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• Frame rate: 30 FPS (frames per second)</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• e/f = energy per frame (30 frames = 1 second)</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• Max energy: 100</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• BMR (basic survival cost): 0.01 e/f (0.3 e/s)</text>

    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• Spike organ:</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Kills organs upon contact, kills creatures on body contact</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Energy use: 0.001 × size (radius in pixels) e/f (0.03 × size per second)</text>

    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• Flipper organ:</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Generates thrust</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Energy use: 0.001 × size (radius in pixels) e/f (0.03 × size per second)</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Force output: 0.5 × size (in px × mass / frame²) (I think?)</text>
    
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• Acceleration = Force ÷ mass (heavier creatures accelerate less)</text>
    <text size="small">&nbsp;&nbsp;&nbsp;&nbsp;• All objects have equal density, so mass depends on total size</text>
  </vstack>
);

Devvit.addCustomPostType({
  name: 'Evolvit Creature Simulator',
  height: 'tall',
  render: (context) => {
    const [page, setPage] = useState<Page>('home');





    const webView = useWebView({
      url: 'page.html',
      onMessage: async (message, webView) => {
        switch (message.type) {
          case 'webViewReady':
          case 'requestUpdate': {
            try {
              const res = await fetch('https://presentr.ai/evolvit/getfull');
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

    const isReady = true

    let pageContent: JSX.Element;
    switch (page) {
      case 'create':
        pageContent = <CreatePage {...context} />;
        break;
      case 'info':
        pageContent = <InfoPage />;
        break;
      case 'specs':
        pageContent = <SpecsPage />;
        break;
      case 'home':
      default:
        pageContent = <HomePage />;
        break;
    }

    return (
      <vstack alignment="top" height="100%" gap="medium">
        <TopTabBar setPage={setPage} />

        <vstack grow>
          {pageContent}
        </vstack>

        <vstack alignment="center" padding="large" backgroundColor="white">
          <button
            onPress={() => webView?.mount?.()}
            disabled={!isReady}
            size="large"
            width="80%"
          >
            🌏 VIEW WORLD 🌎
          </button>
        </vstack>
      </vstack>
    );
  }
});

export default Devvit;