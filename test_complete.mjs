import { compile } from './packages/compiler/dist/index.js';

const source = `
<script lang="ts">
import { myHelper } from './helpers.js';
import { something } from '@other/lib';

interface Props {
  title: string;
  count?: number;
}

const count = signal(0);
const result = myHelper();
</script>

<template>
  <div>{count()}</div>
</template>
`;

const result = compile(source);
console.log(result.code);
