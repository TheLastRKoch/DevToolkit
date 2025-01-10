//Init tagList for all the session
tagList = [];
tagListReassembled = [];

function clearAll(){
    inputValue = ""
    document.getElementById('txtInput').value = ""
    document.getElementById('txtQuery').value = ""
    quill.setText("")
}

function getTags(inputValue) {
    regex = /(\@\[.+?\])/g


    while ((match = regex.exec(inputValue)) !== null) {
        tag = { key: match[1], value: "" }
        if (!tagList.some(item => JSON.stringify(item) === JSON.stringify(tag))){
            tagList.push(tag);
        }
    }
    // TODO: add validation currentStatus = "Error trying to get the tags from the input"
}


function printTags() {
    
    queryText = ""
    for (const tag of tagList) {
        queryText += tag.key + "=" + tag.value + "\n"
    }
    return queryText
}


function reassemblyTags(tagsText) {
    regex = /(.+?)=(.+?)$/gm


    while ((match = regex.exec(tagsText)) !== null) {
        tagListReassembled.push({ key: match[1], value: match[2] });
    }
    // TODO: add validation currentStatus = "Error trying to get the tags from the input"
    return tagListReassembled
}


function replaceTags(inputValue, tagList) {
    for (const tag of tagList) {
        inputValue = inputValue.replaceAll(tag.key, tag.value)
    }
    return inputValue
}

function renderQuery() {
    outputValue = replaceTags(inputValue, tagList)
    document.getElementById('txtOutput').value = outputValue
}

document.getElementById('txtInput').addEventListener('focusout', function () {
    inputValue = document.getElementById('txtInput').value
    getTags(inputValue)
    tagsText = printTags()
    document.getElementById('txtQuery').value = tagsText
});


document.getElementById('txtQuery').addEventListener('focusout', function () {
    queryText = document.getElementById('txtQuery').value
    tagListReassembled = reassemblyTags(queryText)
    outputText = replaceTags(inputValue, tagListReassembled)
    quill.setText(outputText)
});

document.getElementById('btnClearAll').addEventListener('click', function(){
    clearAll()
})

document.getElementById('currentYear').textContent = new Date().getFullYear();