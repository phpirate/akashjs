import { compile } from './packages/compiler/dist/index.js';

const source = `
<script lang="ts">
import { myHelper } from './helpers.js';

const count = signal(0);
const result = myHelper();
</script>

<template>
  <div>{count()}</div>
</template>
`;

try {
  const result = compile(source);
  console.log('=== GENERATED CODE ===');
  console.log(result.code);
  console.log('\n=== CSS ===');
  console.log(result.css || 'undefined');
} catch (e) {
  console.error('Error:', e.message);
}
