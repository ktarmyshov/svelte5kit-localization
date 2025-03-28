<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { loadLocalizations, setLocalizationContextService } from './localization/index.js';

  let { children, data } = $props();

  setLocalizationContextService(data.i18n);
  beforeNavigate((navigation) => {
    if (navigation.to?.url.pathname) {
      loadLocalizations(navigation.to.url.pathname);
    }
  });

  onMount(() => {
    document.body.classList.add('app-started');
  });
</script>

<a href="/">Apples</a>
<a href="/oranges">Oranges</a>
<a href="/bananas">Bananas</a>
<a href="/ananases">Ananases</a>
<br />
<span>Current route: {page.url}</span>
<!-- Page Content -->
{@render children?.()}
