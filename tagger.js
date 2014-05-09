/* global jQuery */
(function( window, document, $, undef) {
	'use strict';

	// get user language
	var userLang = window.navigator.language || window.navigator.userLanguage || 'en-US';

	// WMTagger constructor
	function WMTagger( initObj, callback ){
		var self = this;

		// create caches for commonly used elements
		self._input = $( initObj.input ) || undef;
		self._output = $( initObj.output ) || undef;
		self._display = $( initObj.display ) || undef;

		// check that an input + output were set (required)
		if( ( self._input.length !== 1 ) || ( self._output.length !== 1 ) ) {
			return console.error( 'WMTagger requires an input + output text field' );
		}

		// check that a wrapper for displaying tags was set
		if( self._display.length !== 1 ) {
			self._display = $('<div class="wmtagger-tags"/>');
			self._input.after( self._display );
		}
		else {
			self._display.addClass('wmtagger-tags');
		}

		// create spans for weblit + contextual tags (weblit takes priority)
		self._mixTags = initObj.mixTags || false;
		if( !self._mixTags ) {
			self._display.append( '<span class="wmtagger-weblit-tags"/>' );
		}

		// init WebLit Client
		self.wlc = new window.WebLiteracyClient();

		// setup l10n w/ our best guess (fallback to en-US)
		if( initObj.lang && self.wlc.lang( initObj.lang ) ) {
			self.lang = initObj.lang;
		}
		else if( self.wlc.lang( userLang ) ) {
			self.lang = userLang;
		}
		else {
			self.lang = 'en-US';
		}

		// get weblit tags and map them to needed format
		self._wlcTags = self.wlc.all().map( function( item ) {
			return {
				label: item.term,
				value: item.tag,
				data: item
			};
		});

		// custom autocomplete source
		// merge weblit tags + known tags from makeapi
		function autocompleteSource( request, response ) {
			// filter weblit tags w/ simple regex
			var term = $.ui.autocomplete.escapeRegex( request.term );
			var regex = new RegExp( '^(weblit-?)?' + term, 'i' );
			var weblitTags = [];

			self._wlcTags.forEach( function( wlcTag ) {
				if( regex.test( wlcTag.label ) || regex.test( wlcTag.value ) ) {
					weblitTags.push( wlcTag );
				}
			});

			// get tags already in the make-api
			$.getJSON( 'https://makeapi.webmaker.org/api/20130724/make/tags?t=' + request.term, function( data ) {
				// format resposne as needed
				var makeapiTags = data.tags.map( function( makeTag ) {
					return {
						label: decodeURIComponent(makeTag.term),
						value: decodeURIComponent(makeTag.term),
						data: makeTag
					};
				});

				response( weblitTags.concat(  makeapiTags ) );
			});
		}

		// init the autocomplete
		self._input.autocomplete( {
			source: autocompleteSource,
			minLength: initObj.minLength || 1,
			focus: function() {
				self._input.off( 'blur', function( event ) {
					self.addTag( event );
				});
			},
			close: function() {
				self._input.on( 'blur', function( event ) {
					self.addTag( event );
				});
			}
		});

		// add tag on [enter] or [tab] keys
		self._input.on( 'keydown', function( event ) {
			if( event.which === 13 || event.which === 188 ) {
				event.preventDefault();
				self.addTag( event );
			}
		});

		// add tag on blur
		self._input.on( 'blur', function( event ) {
			self.addTag( event );
		});

		// remove visible tags on click
		self._display.on( 'click', '.btn', function() {
			var tag = $( this ).data( 'tag' );
			self._tagList = $.grep( self._tagList, function( item ) {
				return item !== tag;
			});

			$( this ).remove();
			self._output.val( self._tagList.join( ', ' ) ).trigger( 'change' );
		});

		// if set, run callback so third parties can further modify the ui
		if( typeof callback === 'function' ) {
			callback.call( window, self );
		}

		return self;
	}

	WMTagger.prototype = {
		_tagList: [],
		addTag: function( tag ) {
			var self = this;

			// check if tag is an event and ignore if so
			// replace the event w/ the value of the input field as tag
			if( tag.eventPhase ) {
				tag = {
					label: self.wlc.term( self._input.val() ) || self._input.val(),
					value: self._input.val()
				};
			}

			// check that there is actually a tag to add
			if( tag.value === '' ) {
				return;
			}

			// ensure that there is both a label and value
			if( tag.label === '' ) {
				tag.label = tag.value;
			}

			// add tag to tag list, and output field
			self._tagList.push( tag.value );
			self._output.val( self._tagList.join( ', ' ) ).trigger( 'change' );

			// local cache for tag wrapper
			var tagWrapper = self._display;

			// should we be mixing tags, if not seperate out the weblit tags
			if( !self._mixTags && self.wlc.term( tag.value ) ) {
				tagWrapper = self._display.find( '.wmtagger-weblit-tags:first' );
			}

			// display the tag
			tagWrapper.append('<a class="btn btn-primary auto-tag" data-tag="' + tag.value + '">' + tag.label + ' <span class="fa fa-times"></span></a>');

			// empty the input field
			self._input.val('');
		},
		getTags: function() {
			return JSON.parse( JSON.stringify( this._tagList ) );
		}
	};

	window.WMTagger = WMTagger;
})(this, document, jQuery);
