/* Copyright 2010-2011, Metropolitan Life Insurance Company, All Rights Reserved */
define
([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  './EPWidget',
  './DocumentConfigFilterMixin',
  'dojo/text!./templates/DocumentSearchFilter.html',
  './DateRange',
  'dojo/store/Memory',
  'dijit/form/Form',
  'dijit/form/Button',
  'dijit/form/FilteringSelect',
  'dijit/form/RadioButton',
  'owl/form/DateRangeSelector',
  'dojo/domReady!'
],
function(declare, lang, arr, EPWidget, DocumentConfigFilterMixin, dfTemplate, DateRange) {
	var defaultDateRanges = function() {
		var data = [];
		data.push({id:'CUSTOM_DATE', name:'Custom', startDate: new Date(), endDate: new Date()});
		var drs = DateRange.standard;
		for (var a in drs) {
			var d = drs[a];
			data.push({
				id: a,
				name: d.description,
				startDate: d.startDate,
				endDate: d.endDate
			});
		}
		return data;
	}();
	
	return declare('metlife.epresent.DocumentSearchFilter', [EPWidget, DocumentConfigFilterMixin], {
		templateString: dfTemplate,
		productCategory: '',
		documentCategory: '',
		timeframe: '',
		dateRange: null,
		constructor: function(kwargs) {
			this.timeframeOptionsStore = new dojo.store.Memory({data: kwargs.dateRanges || defaultDateRanges});
		},
		postCreate: function() {
			this.inherited(arguments);
			this.dateRangeSelector.set('disabled',true);
			this.timeframeSelector.watch('value',lang.hitch(this,function(p,o,n){
				this.dateRangeSelector.set('disabled', n != 'CUSTOM_DATE');
				////
				// set the CustomDate option's start/end date to be the currently selected date
				var currentDate = this.timeframeOptionsStore.get(o);
				var customOption = this.timeframeOptionsStore.get('CUSTOM_DATE');
				if (o != "") {
					customOption.startDate = currentDate.startDate;
					customOption.endDate = currentDate.endDate;
				}
			}));
			this.documentSearchFilter.watch('state',lang.hitch(this,function(p,o,n){
				this.getDocumentsSubmitButton.set('disabled', n != '');
			}));
			
			var d = this;
			function bidirectionalBind(prop, ctrl) {
				d.watch(prop, function(p,o,n) {
					console.log("n1", n);
					if (ctrl.get('value') == n) return;
					ctrl.set('value', n);
				});
				ctrl.watch('value', function(p,o,n) {
					console.log("n2", n);
					if (d.get(prop) == n) return;
					d.set(prop, n);
					
				});
			}
			bidirectionalBind('productCategory', this.listOfProductTypes);
			bidirectionalBind('documentCategory', this.listOfDocumentCategories);
			bidirectionalBind('timeframe', this.timeframeSelector);
			bidirectionalBind('dateRange', this.dateRangeSelector);
		},
		_syncDateRangeFromTimeframe: function(tfId) {
			if (tfId) this.dateRangeSelector.set('value', this.timeframeOptionsStore.get(tfId));
		},
		_syncTimeframeFromDateRange: function(dr) {
			// this is a no-op as of the 12.4 release - the Timeframe dropdown will remain Custom even if
			// it matches a supplied timeframe.  For now, we'll leave this stub around simply to document
			// the new behavior
		},
		
		_handleSearchSubmit: function() {
			this.onSearchSubmit({
				productCategory: this.listOfProductTypes.get('value'),
				documentCategory: this.listOfDocumentCategories.get('value'),
				dateRange: this.dateRangeSelector.get('value')
			});
		},
		onSearchSubmit: function(criteria) {
		}
	});
});
