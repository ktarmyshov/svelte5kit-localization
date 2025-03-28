<script lang="ts">
  import { getLocalizationContextService } from '../localization/index.js';

  const { text, getPSText } = getLocalizationContextService();
  const psappleText = getPSText('apples');
  const psorangeTextZero = getPSText('prefix', 'zero');
  const psananaTextZero = getPSText('regex.ananas_and_bananas', 'zero');
</script>

<h1>Welcome to your library project</h1>
<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<span id="text_apple_zero">{text('apples.zero')}</span>
<span id="pstext_apple_zero">{psappleText('zero')}</span>
<br />
<span id="text_apple_one">{text('apples.one')}</span>
<span id="pstext_apple_one">{psappleText('one')}</span>
<br />
<span id="text_apple_many">{text('apples.many', { count: 5 })}</span>
<span id="pstext_apple_many">{psappleText('many', { count: 5 })}</span>
<br />
<span id="text_apple_other">{text('apples.other', { count: 11 })}</span>
<span id="pstext_apple_other">{psappleText('other', { count: 11 })}</span>
<br />
<span id="pstext_oranges_zero">{psorangeTextZero('oranges')}</span>
<br />
<span id="pstext_bananas_zero">{psananaTextZero('bananas')}</span>
<br />
<span id="pstext_ananas_zero">{psananaTextZero('ananas')}</span>
