function getTags(inputValue) {
    regex = /(\@\[.+?\])/g

    const tagList = [];

    while ((match = regex.exec(inputValue)) !== null) {
        tagList.push({ key: match[1], value: "" });
    }
    // TODO: add validation currentStatus = "Error trying to get the tags from the input"

    return tagList
}

function printTags(tagList) {
    
    queryText = ""
    for (const tag of tagList) {
        queryText += tag.key + "=" + tag.value + "\n"
    }
    return queryText
}


function reassemblyTags(tagsText) {
    regex = /(.+?)=(.+?)$/gm

    const tagListReassembled = [];

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
    tagList = getTags(inputValue)
    tagsText = printTags(tagList)
    document.getElementById('txtQuery').value = tagsText
});


document.getElementById('txtQuery').addEventListener('focusout', function () {
    queryText = document.getElementById('txtQuery').value
    tagListReassembled = reassemblyTags(queryText)
    outputText = replaceTags(inputValue, tagListReassembled)
    document.getElementById('txtOutput').value = outputText
});


document.getElementById('currentYear').textContent = new Date().getFullYear();