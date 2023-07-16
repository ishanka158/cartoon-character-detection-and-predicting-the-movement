document.addEventListener('DOMContentLoaded', function() {
    retrieveDefaultValuesFromLocalStorage();
    setupButtonListeners();
});

var infer = function() {
    document.getElementById('output').innerHTML = 'Inferring...';
    document.getElementById('resultContainer').style.display = 'block';
    document.documentElement.scrollTop = 100000;

    getSettingsFromForm(function(settings) {
        var xhr = new XMLHttpRequest();
        xhr.open(settings.method, settings.url, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 400) {
                var response = xhr.response;
                if (settings.format === 'json') {
                    var pretty = document.createElement('pre');
                    var formatted = JSON.stringify(response, null, 4);

                    pretty.innerHTML = formatted;
                    document.getElementById('output').innerHTML = '';
                    document.getElementById('output').appendChild(pretty);
                    document.documentElement.scrollTop = 100000;
                } else {
                    var arrayBufferView = new Uint8Array(response);
                    var blob = new Blob([arrayBufferView], {
                        type: 'image/jpeg'
                    });
                    var base64image = window.URL.createObjectURL(blob);

                    var img = document.createElement('img');
                    img.onload = function() {
                        document.documentElement.scrollTop = 100000;
                    };
                    img.src = base64image;
                    document.getElementById('output').innerHTML = '';
                    document.getElementById('output').appendChild(img);
                }
            } else {
                console.error('Request failed with status ' + xhr.status);
            }
        };
        xhr.onerror = function() {
            console.error('Request failed');
        };
        xhr.send();
    });
};

var retrieveDefaultValuesFromLocalStorage = function() {
    try {
        var access_token = localStorage.getItem('rf.access_token');
        var model = localStorage.getItem('rf.model');
        var format = localStorage.getItem('rf.format');

        if (access_token) {
            document.getElementById('access_token').value = access_token;
        }
        if (model) {
            document.getElementById('model').value = model;
        }
        if (format) {
            document.getElementById('format').value = format;
        }
    } catch (e) {
        // localStorage disabled
    }

    document.getElementById('model').addEventListener('change', function() {
        localStorage.setItem('rf.model', this.value);
    });

    document.getElementById('access_token').addEventListener('change', function() {
        localStorage.setItem('rf.access_token', this.value);
    });

    document.getElementById('format').addEventListener('change', function() {
        localStorage.setItem('rf.format', this.value);
    });
};

var setupButtonListeners = function() {
    // run inference when the form is submitted
    document.getElementById('inputForm').addEventListener('submit', function(e) {
        e.preventDefault();
        infer();
    });

    // make the buttons blue when clicked
    // and show the proper "Select file" or "Enter url" state
    var bttns = document.getElementsByClassName('bttn');
    for (var i = 0; i < bttns.length; i++) {
        bttns[i].addEventListener('click', function() {
            var siblings = this.parentNode.getElementsByClassName('bttn');
            for (var j = 0; j < siblings.length; j++) {
                siblings[j].classList.remove('active');
            }
            this.classList.add('active');

            var fileSelectionContainer = document.getElementById('fileSelectionContainer');
            var urlContainer = document.getElementById('urlContainer');
            var imageOptions = document.getElementById('imageOptions');

            if (document.getElementById('computerButton').classList.contains('active')) {
                fileSelectionContainer.style.display = 'block';
                urlContainer.style.display = 'none';
            } else {
                fileSelectionContainer.style.display = 'none';
                urlContainer.style.display = 'block';
            }

            if (document.getElementById('jsonButton').classList.contains('active')) {
                imageOptions.style.display = 'none';
            } else {
                imageOptions.style.display = 'block';
            }
        });
    }

    // wire styled button to hidden file input
    document.getElementById('fileMock').addEventListener('click', function() {
        document.getElementById('file').click();
    });

    // grab the filename when a file is selected
    document.getElementById('file').addEventListener('change', function() {
        var path = this.value.replace(/\\/g, '/');
        var parts = path.split('/');
        var filename = parts.pop();
        document.getElementById('fileName').value = filename;
    });
};

var getSettingsFromForm = function(cb) {
    var settings = {
        method: 'POST',
    };

    var parts = [
        'https://infer.roboflow.com/',
        document.getElementById('model').value,
        '?access_token=' + document.getElementById('access_token').value
    ];

    var classes = document.getElementById('classes').value;
    if (classes) {
        parts.push('&classes=' + classes);
    }

    var confidence = document.getElementById('confidence').value / 100;
    if (confidence) {
        parts.push('&confidence=' + confidence);
    }

    var overlap = document.getElementById('overlap').value / 100;
    if (overlap) {
        parts.push('&overlap=' + overlap);
    }

    var format = document.querySelector('#format .active').getAttribute('data-value');
    parts.push('&format=' + format);
    settings.format = format;

    if (format === 'image') {
        var labels = document.querySelector('#labels .active').getAttribute('data-value');
        if (labels) {
            parts.push('&labels=on');
        }

        var stroke = document.querySelector('#stroke .active').getAttribute('data-value');
        if (stroke) {
            parts.push('&stroke=' + stroke);
        }

        settings.xhr = function() {
            var override = new XMLHttpRequest();
            override.responseType = 'arraybuffer';
            return override;
        };
    }

    var method = document.querySelector('#method .active').getAttribute('data-value');
    if (method === 'upload') {
        var file = document.getElementById('file').files && document.getElementById('file').files.item(0);
        if (!file) {
            alert('Please select a file.');
            return;
        }

        getBase64fromFile(file).then(function(base64image) {
            settings.url = parts.join('');
            settings.data = base64image;

            console.log(settings);
            cb(settings);
        });
    } else {
        var url = document.getElementById('url').value;
        if (!url) {
            alert('Please enter an image URL.');
            return;
        }

        parts.push('&image=' + encodeURIComponent(url));

        settings.url = parts.join('');
        console.log(settings);
        cb(settings);
    }
};

var getBase64fromFile = function(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
            resolve(reader.result);
        };
        reader.onerror = function(error) {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
};
