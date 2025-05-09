<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import OutputExpression from '@edit/OutputExpression';
    import Evaluate from '@nodes/Evaluate';
    import type Expression from '@nodes/Expression';
    import KeyValue from '@nodes/KeyValue';
    import MapLiteral from '@nodes/MapLiteral';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import { createPoseLiteral } from '@output/Pose';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import Button from '../widgets/Button.svelte';
    import Note from '../widgets/Note.svelte';
    import TextField from '../widgets/TextField.svelte';
    import PoseEditor from './PoseEditor.svelte';

    interface Props {
        project: Project;
        map: MapLiteral | undefined;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, map, editable, id = undefined }: Props = $props();

    // Get the map from the value set, unless its not a valid sequence or the maps of the selections aren't equal.
    let valid = $derived(
        map !== undefined &&
            map.values.every(
                (kv) =>
                    kv instanceof KeyValue &&
                    kv.key instanceof NumberLiteral &&
                    kv.value instanceof Evaluate &&
                    kv.value.is(
                        project.shares.output.Pose,
                        project.getNodeContext(kv.value),
                    ),
            ),
    );

    function revisePercent(kv: KeyValue | Expression, percent: string) {
        let text = percent.replace('%', '');
        const number = NumberLiteral.make(text, Unit.create(['%']));
        if (kv instanceof KeyValue && number.isInteger())
            Projects.revise(project, [[kv.key, number]]);
    }

    function addPose(index: number) {
        if (map === undefined) return;
        const kv = map.values[index];
        revise([
            ...map.values.slice(0, index + 1),
            KeyValue.make(
                NumberLiteral.make(
                    kv instanceof KeyValue && kv.key instanceof NumberLiteral
                        ? kv.key.number.getText().replace('%', '')
                        : 0,
                ),
                createPoseLiteral(project, $locales),
            ),
            ...map.values.slice(index + 1),
        ] as KeyValue[]);
    }

    function removePose(index: number) {
        if (map === undefined) return;
        revise([
            ...map.values.slice(0, index),
            ...map.values.slice(index + 1),
        ] as KeyValue[]);
    }
    function movePose(index: number, direction: 1 | -1) {
        if (map === undefined) return;
        const kv = map.values[index] as KeyValue;
        if (kv === undefined) return;
        const newValues = map.values.slice() as KeyValue[];
        if (direction < 0) {
            const previous = newValues[index - 1];
            newValues[index - 1] = kv;
            newValues[index] = previous;
        } else {
            const next = newValues[index + 1];
            newValues[index + 1] = kv;
            newValues[index] = next;
        }
        revise(newValues);
    }

    function revise(newValues: KeyValue[]) {
        if (map) Projects.revise(project, [[map, MapLiteral.make(newValues)]]);
    }
</script>

<div class="pairs" {id}>
    {#if map && valid}
        {#each map.values as pair, index}
            {#if pair instanceof KeyValue && pair.value instanceof Evaluate}
                <div class="pair">
                    <div class="percent"
                        ><TextField
                            id="percent-editor-{id}-{index}"
                            text={pair.key.toWordplay()}
                            description={(l) =>
                                l.ui.palette.sequence.field.percent}
                            placeholder={(l) =>
                                l.ui.palette.sequence.field.percent}
                            validator={(value) => {
                                const number = parseInt(value.replace('%', ''));
                                if (isNaN(number))
                                    return (l) => l.ui.palette.error.nan;
                                if (number < 0 || number > 100)
                                    return (l) => l.ui.palette.error.percent;
                                const previous = map?.values[index - 1];
                                const next = map?.values[index + 1];
                                if (
                                    previous &&
                                    previous instanceof KeyValue &&
                                    previous.key instanceof NumberLiteral &&
                                    number / 100 <
                                        previous.key.getValue().num.toNumber()
                                )
                                    return (l) =>
                                        l.ui.palette.error.moreThanPrevious;
                                if (
                                    next &&
                                    next instanceof KeyValue &&
                                    next.key instanceof NumberLiteral &&
                                    number / 100 >
                                        next.key.getValue().num.toNumber()
                                )
                                    return (l) =>
                                        l.ui.palette.error.lessThanNext;

                                return true;
                            }}
                            changed={(value) => revisePercent(pair, value)}
                            {editable}
                        />
                        <Button
                            tip={(l) => l.ui.palette.sequence.button.add}
                            active={editable}
                            action={() => addPose(index)}
                            icon="+"
                        ></Button>
                        <Button
                            tip={(l) => l.ui.palette.sequence.button.remove}
                            action={() => removePose(index)}
                            active={editable &&
                                map !== undefined &&
                                map.values.length > 1}
                            icon={CANCEL_SYMBOL}
                        ></Button>
                        <Button
                            tip={(l) => l.ui.palette.sequence.button.up}
                            action={() => movePose(index, -1)}
                            active={editable && index > 0}
                            icon="↑"
                        ></Button>
                        <Button
                            tip={(l) => l.ui.palette.sequence.button.down}
                            action={() => movePose(index, 1)}
                            active={editable && index < map.values.length - 1}
                            icon="↓"
                        ></Button>
                    </div>
                    <div class="pose"
                        ><PoseEditor
                            {project}
                            outputs={[
                                new OutputExpression(
                                    project,
                                    pair.value,
                                    $locales,
                                ),
                            ]}
                            sequence
                            {editable}
                        /></div
                    >
                </div>
            {/if}
        {/each}
    {:else}
        <Note
            ><LocalizedText
                path={(l) => l.ui.palette.labels.notSequence}
            /></Note
        >
    {/if}
</div>

<style>
    .pairs {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
    }

    .pair {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .percent {
        width: 3em;
    }
</style>
