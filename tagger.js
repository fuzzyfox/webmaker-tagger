/* global $, WebLiteracyClient */
(function(){
	'use strict';

	var wlc = new WebLiteracyClient();

	var wlcSuggestions = [];
	var selectedTags = [];
	var tagInput = $('#tagger');

	function setWLCSuggestions(lang) {
		wlc.lang(lang);
		wlcSuggestions = wlc.all().map(function(item) {
			return {
				label: item.term,
				value: item.tag,
				data: item
			};
		});

		$('[id$=tag] .btn').each(function(i, el) {
			$(el).html(wlc.term(el.getAttribute('data-tag')));
		});

		tagInput.autocomplete('option', 'source', autocompleteSource);
	}

	function autocompleteSource(request, response) {
		function buildResponse(makeapiTags){
			var term = $.ui.autocomplete.escapeRegex(request.term);
			var regex = new RegExp(term, 'i');
			var wlcTags = [];

			wlcSuggestions.forEach(function(item){
				if(regex.test(item.label) || (/^weblit/i.test(term) && regex.test(item.value))){
					wlcTags.push(item);
				}
			});

			response(wlcTags.concat(makeapiTags));
		}

		// combine weblit tags + known tags
		$.getJSON('https://makeapi.webmaker.org/api/20130724/make/tags?t=' + request.term, function(data){
			buildResponse(data.tags.map(function(item){
				return {
					label: decodeURIComponent(item.term),
					value: decodeURIComponent(item.term),
					data: item
				};
			}));
		});
	}

	function addTag(){
		if(tagInput.val() === '') {
			return;
		}

		var tag = {
			label: tagInput.val(),
			value: tagInput.val()
		};

		if(wlc.term(tag.value)){
			tag.label = wlc.term(tag.value);
			$('#weblit-tag').append('<a class="btn btn-primary auto-tag" style="background-color:' + wlc.color(tag.value) + '" data-tag="' + (tag.value) + '">' + tag.label + ' <span class="fa fa-times"></span></a>');
		}
		else {
			$('#tag').append('<a class="btn btn-primary auto-tag" data-tag="' + (tag.value) + '">#' + tag.label + ' <span class="fa fa-times"></span></a>');
		}
		selectedTags.push(tag.value);
		tagInput.val('');
	}

	tagInput.autocomplete({
		source: autocompleteSource,
		minLength: 1,
		focus: function () {
			tagInput.off('blur', addTag);
		},
		close: function () {
			tagInput.on('blur', addTag);
		}
	});

	tagInput.on('keydown', function(e){
		if(e.which === 13 || e.which === 188) {
			e.preventDefault();
			addTag();
		}
	});

	tagInput.on('blur', addTag);

	wlc.supportedLangs().forEach(function(lang) {
		$('#language').append('<option value="' + lang +'">' + lang +'</option>');
	});

	$('#language').change(function() {
		setWLCSuggestions(this.value);
	});

	$('#language').val('en-US');
	setWLCSuggestions('en-US');

	$('[id$=tag]').on('click', '.btn', function() {
		var tag = this.getAttribute('data-tag');
		selectedTags = $.grep(selectedTags, function(item) {
			return item !== tag;
		});
		$(this).remove();
		console.log(selectedTags);
	});
}());
