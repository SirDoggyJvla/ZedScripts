import os
import json

SCRIPT_DIR = os.path.join(os.path.dirname(__file__), '..')

BLOCKS_DIR = os.path.join(SCRIPT_DIR, 'external', 'pz-scripts-data', 'data', 'blocks')
OUTPUT_FILE = os.path.join(SCRIPT_DIR, 'src', 'data', 'scriptBlocks.json')

def prepare_parameters(data: dict) -> dict:
    # remove unnecessary fields
    data.pop('version')
    data.pop('$schema')

    # for each parameters, make an easy access by name (case insensitive)
    parameters_data = data.get('parameters', [])
    if parameters_data is not None:
        parameters_new = {}
        for param_data in parameters_data:
            name = param_data['name']
            parameters_new[name.lower()] = param_data
        data['parameters'] = parameters_new

    return data

# combine all block json files into one
blocks = {}
for filename in os.listdir(BLOCKS_DIR):
    if filename.endswith('.json'):
        key = os.path.splitext(filename)[0]
        file_path = os.path.join(BLOCKS_DIR, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            blocks[key] = prepare_parameters(json.load(f))

# copy #ref of parameters
for block_key, block_data in blocks.items():
    parameter = block_data.get('parameters', {})
    for param_key, param_data in parameter.items():
        if '#ref' in param_data:
            ref_key = param_data['#ref']
            path = ref_key.split('/')
            origin_block = path[0]
            origin_param = path[1].lower()

            new_param_data = blocks[origin_block]['parameters'][origin_param].copy()
            parameter[param_key] = new_param_data

            param_data.pop('#ref')

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(blocks, f, indent=2, ensure_ascii=False)

# print(f"Combined JSON written to {OUTPUT_FILE}")