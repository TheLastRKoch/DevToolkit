//Init Quill
const quill = new Quill('#txtOutput', {
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            ['blockquote', 'code-block', 'link'], [{ 'align': [] }, { 'list': 'ordered' }, { 'list': 'bullet' }], ['clean']
        ],
    },
    placeholder: '',
    theme: 'snow',
});