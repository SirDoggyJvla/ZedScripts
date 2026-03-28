# Contributing
Want to contribute to the project ? Feel free to do so ! You can also help by providing descriptions and data for scripts in the [pz-scripts-data](https://github.com/SirDoggyJvla/pz-scripts-data) repository.

The repository relies on a pre-commit hook to update automatically the singular JSON data file for scripts. To use it, do the following:
1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   - Linux/Mac: `source .venv/bin/activate`
   - Windows: `.venv\Scripts\activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Install pre-commit hooks:
   ```bash
   pre-commit install
   ```

This pre-commit hook will make a copy of the singular JSON file from the submodule repository pz-scripts-data into the `src/data` folder before each commit.