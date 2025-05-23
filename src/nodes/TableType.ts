import type Conflict from '@conflicts/Conflict';
import ExpectedColumnType from '@conflicts/ExpectedColumnType';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Bind from '@nodes/Bind';
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import AnyType from './AnyType';
import BasisType from './BasisType';
import type Context from './Context';
import type Definition from './Definition';
import Names from './Names';
import { list, node, type Grammar, type Replacement } from './Node';
import type Reference from './Reference';
import StructureDefinition from './StructureDefinition';
import StructureType from './StructureType';
import Sym from './Sym';
import TableLiteral from './TableLiteral';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';

export default class TableType extends BasisType {
    readonly open: Token;
    readonly columns: Bind[];
    readonly close: Token | undefined;

    /** The structure definition that defines each row's data, derived from the table type. */
    readonly definition: StructureDefinition;

    constructor(open: Token, columns: Bind[], close: Token | undefined) {
        super();

        this.open = open;
        this.columns = columns;
        this.close = close;

        this.definition = this.getStructureDefinition();

        this.computeChildren();
    }

    static make(columns: Bind[] = []) {
        return new TableType(
            new Token(TABLE_OPEN_SYMBOL, [Sym.TableOpen]),
            columns,
            new Token(TABLE_CLOSE_SYMBOL, [Sym.TableClose]),
        );
    }

    static getPossibleReplacements() {
        return [TableType.make()];
    }

    static getPossibleAppends() {
        return [TableType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'TableType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.TableOpen) },
            { name: 'columns', kind: list(true, node(Bind)), space: true },
            { name: 'close', kind: node(Sym.TableClose) },
        ];
    }

    clone(replace?: Replacement) {
        return new TableType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('columns', this.columns, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    computeConflicts(context: Context) {
        const conflicts: Conflict[] = [];

        // Columns must all have types.
        this.columns.forEach((column) => {
            if (column.getType(context) instanceof AnyType)
                conflicts.push(new ExpectedColumnType(this, column));
        });

        return conflicts;
    }

    getDefinitions(): Definition[] {
        return this.columns;
    }

    getStructureDefinition() {
        return StructureDefinition.make(
            undefined,
            Names.make([]),
            [],
            undefined,
            this.columns,
            undefined,
        );
    }

    withColumns(references: Reference[]) {
        return TableType.make(
            references
                .map((ref) =>
                    this.columns.find((bind) => bind.hasName(ref.getName())),
                )
                .filter((bind): bind is Bind => bind !== undefined),
        );
    }

    getColumnNamed(name: string): Bind | undefined {
        return this.columns.find((c) => c instanceof Bind && c.hasName(name));
    }

    acceptsAll(types: TypeSet, context: Context) {
        return types.list().every((type) => {
            if (!(type instanceof TableType)) return false;
            if (this.columns.length === 0) return true;
            if (this.columns.length !== type.columns.length) return false;
            for (let i = 0; i < this.columns.length; i++)
                if (
                    !this.columns[i]
                        .getType(context)
                        .accepts(type.columns[i].getType(context), context)
                )
                    return false;
            return true;
        });
    }

    resolveTypeVariable(name: string, context: Context): Type | undefined {
        const listDef = context.getBasis().getSimpleDefinition('table');
        return listDef.types !== undefined &&
            listDef.types.hasVariableNamed(name)
            ? new StructureType(this.definition)
            : undefined;
    }

    getBasisTypeName(): BasisTypeName {
        return 'table';
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TableType;
    getLocalePath() {
        return TableType.LocalePath;
    }

    getCharacter() {
        return Characters.Table;
    }

    getDefaultExpression() {
        return TableLiteral.make();
    }
}
