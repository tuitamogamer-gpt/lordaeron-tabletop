import { parseArgs } from 'node:util';

export function simulationOptions(args: string[]) {
 const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
  trace: { type: 'boolean', default: false }, output: { type: 'string' },
  'max-commands': { type: 'string', default: '12000' },
 } });
 const [seedText = '2005', overlord = 'kelthuzad', roster = 'default'] = positionals;
 if (positionals.length > 3) throw new Error('Usage: simulate [seed] [overlord] [default|casters] [--trace] [--output file] [--max-commands count]');
 const seed = Number(seedText), maxCommands = Number(values['max-commands']);
 if (!Number.isSafeInteger(seed) || seed < 1 || seed > 0xffffffff) throw new Error('The seed must be a positive 32-bit integer.');
 if (!['kelthuzad', 'nefarian', 'kazzak'].includes(overlord)) throw new Error('Unknown Overlord.');
 if (!['default', 'casters'].includes(roster)) throw new Error('Unknown roster; choose default or casters.');
 if (!Number.isSafeInteger(maxCommands) || maxCommands < 1 || maxCommands > 20000) throw new Error('The command limit must be between 1 and 20000.');
 return { seed, overlord, roster, maxCommands, trace: values.trace, output: values.output };
}
