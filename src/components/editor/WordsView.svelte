<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Words from '@nodes/Words';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Words;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

<span class="words {$blocks ? 'blocks' : ''} {node.getFormat()}"
    ><NodeView node={node.open} /><NodeSequenceView
        nodes={node.getNodeSegments()}
    /><NodeView node={node.close} />
</span>

<style>
    .words.blocks {
        display: flex;
        flex-direction: row;
    }

    .italic {
        font-style: italic;
    }
    .underline {
        text-decoration: underline;
    }
    .light {
        font-weight: 300;
    }
    .bold {
        font-weight: bold;
    }
    .extra {
        font-weight: 900;
    }
</style>
