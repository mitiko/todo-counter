const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require("path"); // maybe not?

async function* walk(directory) {
    for await (const d of await fs.promises.opendir(directory)) {
        const entry = path.join(directory, d.name);
        if (d.isDirectory())
            yield* walk(entry);
        else if (d.isFile())
            yield entry;
    }
};

const main = async () => {
    let inputTodoRegex = core.getInput('todo-regex');
    let inputFilesIncludeRegex = core.getInput('include-files');
    let inputFilesExcludeRegex = core.getInput('exclude-files');
    // if (inputFilesExcludeRegex == '')
    //     inputFilesExcludeRegex = '^(\.git|node_modules)'
    // if (inputTodoRegex == '')
    //     inputTodoRegex = 'TODO:'
    let todoRegex = new RegExp(inputTodoRegex);
    let filesIncludeRegex = new RegExp(inputFilesIncludeRegex);
    let filesExcludeRegex = new RegExp(inputFilesExcludeRegex);

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

    let count = 0;
    for await (const file of walk('.')) {
        if (!fileFilter(file))
            continue;

        const contents = await fs.promises.readFile(file, { encoding: 'utf8' });
        const addCount = (contents.match(todoRegex) || []).length;
        if (addCount > 0)
            console.log('count for ', file, addCount);
        count += addCount;
    }

    core.setOutput("count", count);
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
