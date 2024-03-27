const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require("path"); // maybe not?

async function* walk(directory, filter = (_file) => true) {
    for await (const d of await fs.promises.opendir(directory)) {
        const entry = path.join(directory, d.name);
        if (d.isDirectory())
            yield* walk(entry, filter);
        else if (d.isFile() && filter(entry))
            yield entry;
    }
};

const main = async () => {
    const inputTodoRegex = core.getInput('todo-regex');
    const inputFilesIncludeRegex = core.getInput('files-include');
    const inputFilesExcludeRegex = core.getInput('files-exclude');
    let todoRegex = new RegExp(inputTodoRegex);
    let filesIncludeRegex = new RegExp(inputFilesExcludeRegex);
    let filesExcludeRegex = new RegExp(inputFilesIncludeRegex);

    console.log(`re1: ${todoRegex}`);
    console.log(`re2: ${filesIncludeRegex}`);
    console.log(`re3: ${filesExcludeRegex}`);

    const fileIncludeFilter = inputFilesIncludeRegex == '' ?
        (_) => true :
        (file) => filesIncludeRegex.test(file);
    const fileExcludeFilter = inputFilesExcludeRegex == '' ?
        (_) => false :
        (file) => filesExcludeRegex.test(file);
    const fileFilter = (file) => fileIncludeFilter(file) && !fileExcludeFilter(file);

    for await (const file of walk('.', fileFilter))
        console.log(file);

    core.setOutput("count", 0);
    // TODO: count-diff?

    // // Get the JSON webhook payload for the event that triggered the workflow
    // const payload = JSON.stringify(github.context.payload, undefined, 2)
    // console.log(`The event payload: ${payload}`);
};

try {
    main()
} catch (error) {
    core.setFailed(error.message);
}
