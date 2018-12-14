define
([
  'dojo/_base/declare',
  'dojo/string',
  'dojo/_base/array',
  'dojo/_base/event',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/date/locale',
  'dojo/date/stamp',
  
  'dojo/text!./templates/_MultiSelectHeader.html',
  'dojo/i18n!./nls/documentTypes',
  './svc/cTrackerServices',
  
  'dijit/_Widget',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  './_NLSMixin',
  
  'dijit/form/CheckBox',
  'dijit/form/Button',
  'dojo/store/Memory',
  'dojo/Stateful',

  'owl/table/EnhancedTable',
  'owl/table/ColDef',
  'owl/table/PagerPluginEnhanced',
  'owl/table/ZeroEntriesWarningPlugin',
  'owl/widget/Ellipsis',
  'dojo/dom-construct'

],
function(
		declare,string, arr, event, lang, domcl,domStyle, locale, stamp, 
		mshdTmpl, docTypes, cTrackerServices,
		Widget, Templated, WidgetsInTemplate, NLSMixin, CheckBox, Button, Memory, Stateful, EnhancedTable, ColDef, PagerPluginEnhanced, ZeroEntriesWarningPlugin,Ellipsis,domConstruct
){
	var DocumentLink = declare('metlife.epresent._DocumentLink', [Widget, Templated,WidgetsInTemplate], {
		table: null,
		doc: null,
		templateString: '<a href="#" data-dojo-attach-event="onclick:_handleOnClick" name=""><span><div data-dojo-attach-point="doclink" data-dojo-type="owl.widget.Ellipsis"></div></span></a>',
		//templateString: '<a href="#" style="margin-left:20px" data-dojo-attach-point="doclink" data-dojo-attach-event="onclick:_handleOnClick"></a>',
		postCreate: function() {
			this.inherited(arguments);
			this.doclink.set('content',this.doc.documentDescriptionTranslated) ;
			this.set('name',this.doc.simplePolicy.groupNumber+'_'+this.doc.simplePolicy.policyNumber+'_'+this.doc.documentDescriptionTranslated);
			//this.doclink.set('content','A very long docuemnt Name A very long docuemnt Name A very long docuemnt Name A very long docuemnt Name A very long docuemnt Name A very long docuemnt Name');
		},
		_handleOnClick: function(evt) {
			event.stop(evt);
			this.table._viewDocument(this.doc);
		}
	});
	
	var PayBillLink = declare('metlife.epresent._PayBillLink', [Widget, Templated], {
		table: null,
		doc: null,
		templateString: '<a class="payBillLink" href="#" data-dojo-attach-point="payBillLink" data-dojo-attach-event="onclick:_handleOnClick"></a>',
		postCreate: function() {
			this.inherited(arguments);
			this.domNode.innerHTML = 'Pay Bill';
						
		},
		_handleOnClick: function(evt) {
			var payBillURL = string.substitute(this.table.payBillURLTemplate,{ policyNumber: this.doc.simplePolicy.policyNumber, policySuffix: this.doc.simplePolicy.hkey3 , carrierAdminSystem: this.doc.simplePolicy.carrierAdminSystem});
			this.set("href",payBillURL);
		}
		
	});
	
	var PayBillLinkV2 = declare('metlife.epresent._PayBillLinkV2', [Widget, Templated], {
		table: null,
		doc: null,
		templateString: '<a class="payBillLinkV2" href="#" data-dojo-attach-point="payBillLinkV2" data-dojo-attach-event="onclick:_handleOnClick"></a>',
		postCreate: function() {
			this.inherited(arguments);
			this.domNode.innerHTML = 'Pay Bill';
						
		},
		_handleOnClick: function(evt) {
			var payBillURLV2 = string.substitute(this.table.payBillURLTemplateV2,{ policyNumber: this.doc.simplePolicy.policyNumber, policySuffix: this.doc.simplePolicy.hkey3 , carrierAdminSystem: this.doc.simplePolicy.carrierAdminSystem});
			this.set("href",payBillURLV2);
		}
		
	});
	
	var AcceptPolicyLink = declare('metlife.epresent.AcceptPolicyLink', [Widget, Templated], {
		table: null,
		docId: null,
		url :'ePolicy/acceptPolicy',
		templateString: '<a class="AcceptPolicyLink" href="#" data-dojo-attach-point="AcceptPolicyLink" data-dojo-attach-event="onclick:_handleOnClick"></a>',
		postCreate: function() {
			this.inherited(arguments);
			this.domNode.innerHTML = 'Accept Policy';
						
		},
		_handleOnClick: function(evt) {
			this.table.acceptPolicyFlow(this.url,this.docId)
		}

		
	});
	
	var SupplementLink = declare('metlife.epresent._SupplementsLink', [Widget, Templated], {
		table: null,
		doc: null,
		templateString: '<div class="supplementHeader"><a  class="supplementHeaderLink" href="#" data-dojo-attach-point="supplementLink" ' +
		' data-dojo-attach-event="onclick:_handleOnClick">Additional Information</a>' +
		'<div style="display:none" data-dojo-attach-point="supplement"></div></div>',
		postCreate: function() {
			this.inherited(arguments);
			//this.domNode.innerHTML = 'Supplements';
			
			for(var i=0; i<this.doc.docInserts.length; i++) {
			
					domConstruct.place('<div class="supplementDiv"><a class="supplementLink" href=' + this.doc.docInserts[i].documentUrl + ' target="_new">' + this.doc.docInserts[i].description + '</a></div>',this.supplement,'last');
				  				   
				}
			
			
		},
		_handleOnClick: function(evt) {
			if (this.supplement.style.display=='block')
			{
				
				domcl.remove(this.domNode, 'supplementHeaderExpanded');
				domcl.add(this.domNode, 'supplementHeader');
				this.supplement.style.display='none';
			}
			else
			{
				domcl.remove(this.domNode, 'supplementHeader');
				domcl.add(this.domNode, 'supplementHeaderExpanded');
				this.supplement.style.display='block';
				
			}
		
		}
		
	});
	
	
	var columnNames = ['productCategory', 'policyNumberDisplay', 'documentDescriptionTranslated', 'documentCreatedOn','documentCreatedOnText'];
	

	var clazz = declare('metlife.epresent.DocumentResultsTableEnhanced', [dijit._Widget, metlife.epresent._NLSMixin], {
		docs: null,
		recentBills : null,
		recentBillsV2 : null,
		docStatusList : null,
		actor:'Agent',
		policyNumberOveride : [{'CARRIERADMIN':'STRK','OVERRIDE':'GROUPNAME','PREFIX':'Made available by','SUFFIX':''},{'CARRIERADMIN':'BIOS','OVERRIDE':'CLAIMNUM','PREFIX':'','SUFFIX':'(Claim #)'}],
		showColumns : columnNames,
		hideColumns : [],
		payBillURLTemplate: 'https://aheserviceqa.metlife.com/servlet/Controller?TO=eSvcBillingGateway&SERVICE=eService&Portal=IB&PolicyNum=${policyNumber}&PolicySuffix=${policySuffix}&Lob=${carrierAdminSystem}',
		payBillURLTemplateV2 : 'https://online.metlife.com/edge/web/payments/makePayment?policyInfo=${policyNumber}|${carrierAdminSystem}|${policySuffix}&Source=forPhoenix',
		readDocs: {},
		constructor: function(kwargs) {
			this.showColumns = arr.filter(kwargs.showColumns || this.showColumns, function(sc) {
				return !arr.some(kwargs.hideColumns, function(hc) {
					return hc == sc;
				});
			});
			
		},
		postMixInProperties: function() {
			////
			// we're doing caching on the client side, so use a Memory store for the
			// table (vs. a ServiceStore).  NOTE that dojo.store.Cache isn't really usable
			// here.
			this.store = new Memory();
		},
		setReadDocs: function(docIds) {
			arr.forEach(docIds, function(docId) {
				this.readDocs[docId] = true;
			}, this);
			if (this.docs) {
				arr.forEach(this.docs, function(doc) {
					doc.set('isRead', this.readDocs[doc.documentId] ? true : false);
				}, this);
			}
		},
		buildRendering: function() {
			var table = this;
			this.inherited(arguments);
			domcl.add(this.domNode, 'metlifeBusinessWidget metlifeDocumentResultsTableEnhanced');
			this.createTable(this.getColDefs());
		},
		_guessContentType: function(doc) {
			return 'contentTypePDF';
		},
		_guessContentTypeDOC: function(doc) {
			return 'contentTypeDOC';
		},
		_setDocsAttr: function(docs) {
			payBillIndicator = false;
			if (this.docs == null || this.docs.length <= 0) { // HACK don't set the zeroResults message at least one search executes
				var length = this.resultsTable.plugins.length;
				if(length  && length <=1)
				{
					var z = new ZeroEntriesWarningPlugin({message: this.nls.messages.searchZeroResults});
					z.connect(this.resultsTable);
					this.resultsTable.plugins.push(z);
				}
			}
			arr.forEach(docs, function(doc) {
				lang.mixin(doc, new dojo.Stateful());
				if (!doc.documentDescriptionTranslated) {
					doc.documentDescriptionTranslated = docTypes[doc.documentDescription] || doc.documentDescription;
				}
				
				if (!doc.documentCreatedOnText)
				{
					doc.documentCreatedOnText = locale.format(stamp.fromISOString(doc.documentCreatedOn), {formatLength: 'short', selector: 'date'});
				}
				if (arr.indexOf(this.recentBills,doc.documentId) > -1)
					{
					payBillIndicator = true;
					}
				doc.isRead = this.readDocs[doc.documentId] ? true : false;
			}, this);
			
			if(payBillIndicator)
			{
				this.resultsTable.destroyRecursive();
				this.createTable(this.getColDefs('action'));
			}
			//Add logic to remove Agent Version if actor is Customer
			var docArray = [];
			if(this.actor == "Customer")
			{
				arr.forEach(docs, lang.hitch(this,function(doc,idx) {
					if (doc.meta["RCPNTID"]) {
						
						if(doc.meta["RCPNTID"] == 'OWNER' || doc.meta["RCPNTID"] == 'CUSTOMER')
						{
							docArray.push(doc);
						}
					} else if (!doc.meta["RCPNTID"]){
						
						docArray.push(doc);
					}
				}));
				this._set('docs', docArray);
				this.store.setData(docArray);
			}
			else
			{
				this._set('docs', docs);
				this.store.setData(docs);
			}
			if (this.docs == null || this.docs.length <= 0) { // HACK don't set the zeroResults message at least one search executes
				var length = this.resultsTable.plugins.length;
				if(length  && length <=1)
				{
					var z = new ZeroEntriesWarningPlugin({message: this.nls.messages.searchZeroResults});
					z.connect(this.resultsTable);
					this.resultsTable.plugins.push(z);
				}
			}
						
			this.resultsTable.refresh();
			
		},
		_checkIfAnythingIsSelected: function() {
			var isSelected = arr.some(this.docs, function(doc) {return doc.selected;});
			this.selectAllHeader.viewSelected.set('disabled', !isSelected);
		},
		_viewDocument: function(doc) {
			this._viewDocuments([doc]);
		},
		_viewSelected: function() {
			this._viewDocuments(arr.filter(this.docs, function(doc) {
				return doc.selected;
			}));
		},
		_viewDocuments: function(docs) {
			this.onBeforeViewDocuments(docs);
			arr.forEach(docs, function(doc) {
				this.readDocs[doc.documentId] = true;
				doc.set('isRead', true);
				cTrackerServices.markDocumentReadByRunAsUser(doc.documentId);
			}, this);
			this.onViewDocuments(docs);
		},
		onBeforeViewDocuments: function(docs) {
		},
		onViewDocuments: function(docs) {
		},
		createTable: function(colDefs)
		{
			this.resultsTable = new EnhancedTable({
     			plugins: [new PagerPluginEnhanced()],
     			colDefs:colDefs,
				store: this.store
			}).placeAt(this.domNode);
			this.resultsTable.startup();
			
		},
		acceptPolicyFlow : function (url,docId){
			console.log("joe ; inside acceptPolicyFlow");
			console.log(url);
			console.log(docId);

		},
		getColDefs : function(mode)	{
			var table = this;
			var colDefs = [
				new ColDef({
					title: this.nls.labels.labelProductType, 
					sortable: true, 
					field: 'productCategory', 
					sortManagerIndex : 2, 
					renderFunc: function(field, node, item) {
						node.innerHTML = field;
					}
				}),
				new ColDef({
					title: 'Patient Name', 
					sortable: true, 
					field: 'patientName', 
					sortManagerIndex : 2, 
					renderFunc: function(field, node, item) {
						node.innerHTML = item.meta['patientName'];
					}
				}),
				new ColDef({
					title: 'Date of Service', 
					sortable: true, 
					field: 'dateOfService', 
					sortManagerIndex : 2, 
					renderFunc: function(field, node, item) {
						node.innerHTML = item.meta['dateOfService'];
					}
				}),
				
						
				new ColDef({
					title: this.nls.labels.labelPolicyLong, 
					sortable: true,
					field:'policyNumberDisplay', 
					sortManagerIndex: 3,
					renderFunc: function(field, node, item) {
						var policyOverride = null;
						var policyPrefix = "";
						var policySuffix = "";
						if (table.policyNumberOveride == null)
						{
							node.innerHTML = field;
						}
						else
						{
							
							arr.forEach(table.policyNumberOveride, function(override) {
									if (item.simplePolicy.carrierAdminSystem == override.CARRIERADMIN)
									{
									policyOverride = override.OVERRIDE;
									policyPrefix = override.PREFIX;
									policySuffix = override.SUFFIX;
									}
							}, this);
							var policyNumberOverride = null;
							policyNumberOverride = item.meta.policyOverride || item.meta[policyOverride];
							if ((policyOverride == null) && (policyNumberOverride == null))
							{
								node.innerHTML = field;
							}
							else
							{
								node.innerHTML = policyPrefix + " " + policyNumberOverride + " " + policySuffix;
							}
							
							
						}
						
					}
				}),
				new ColDef({
					title: this.nls.labels.labelDocument,
					actor: this.actor,
					headerClass: 'documentColumn',
					field: 'documentDescriptionTranslated', 
					sortable: true, 
					sortManagerIndex: 4,
					renderFunc: function(field, node, item) {
						var docLink = new DocumentLink({doc: item, table: table}).placeAt(node);
						docLink.startup();
						domcl.add(node, 'metlifeDocument');
						var docFormatArray = ["doc","DOC"];
						if(arr.indexOf(docFormatArray,item.meta["DOCUMENTFORMAT"]) > -1)
						{
							domcl.add(node, table._guessContentTypeDOC(item));
						}
						else
						{
							domcl.add(node, table._guessContentType(item));
						}
						if (item.isRead) {
							domcl.add(node.parentNode, 'readDocument');
						}
						else {
							domcl.add(node.parentNode, 'notReadDocument');
						}
						if (this.isReadWatchback) this.isReadWatchback.unwatch();
						this.isReadWatchback = item.watch('isRead', function(p,o,n) {
							domcl.remove(node.parentNode, 'notReadDocument');
							if (n) domcl.add(node.parentNode, 'readDocument');
						});
						if (arr.indexOf(table.recentBills,item.documentId) > -1) {
							domStyle.set(docLink.domNode,{"width":"70%","float":"left"});
							var pb = new PayBillLink({doc: item, table: table}).placeAt(node);
							pb.startup();
						}
						if ((arr.indexOf(table.recentBillsV2,item.meta["EOPSDOCUMENTID"]) > -1) && item.meta["payBillLinkFlag"] == "set") {
							domStyle.set(docLink.domNode,{"width":"70%","float":"left"});
							var pb = new PayBillLinkV2({doc: item, table: table}).placeAt(node);
							pb.startup();
						}
						if (item.docInserts.length > 0) {
							domcl.remove(node, 'metlifeDocument');
							domcl.add(node, 'metlifeDocWithSupplements');
							var sl = new SupplementLink({doc:item, table: table}).placeAt(node);
							sl.startup();
						}
						
						//Below Accept policy logic should be displayed only for Owners
						if(this.actor == "Customer") {
							if (arr.indexOf(table.docStatusList,item.meta["EOPSDOCUMENTID"]) > -1) {
								domStyle.set(docLink.domNode,{"width":"70%","float":"left"});
								var pb = new AcceptPolicyLink({docId: item.meta["EOPSDOCUMENTID"], table: table}).placeAt(node);
								pb.startup();
							}
						}
					}
				}),
				new ColDef({
					title: this.nls.labels.labelDate, 
					field: 'documentCreatedOn', 
					sortable: true, 
					//sorted: true, 
					//sortDir: 'desc', 
					sortManagerIndex: 1,
					formatFunc: function(date) {
						return locale.format(stamp.fromISOString(date), {formatLength: 'short', selector: 'date'});
					}
				}),
				new ColDef({
					title: this.nls.labels.labelDate, 
					field: 'documentCreatedOnText', 
					sortable: true,
					sorted: true, 
					sortDir: 'desc', 
					sortManagerIndex: 0,
					renderFunc: function(field, node, item) {
						node.innerHTML = field;
					}
				}),
				new ColDef({
					title: 'Date Processed', 
					field: 'dateProcessed', 
					sortable: true,
					sorted: true, 
					sortDir: 'desc', 
					sortManagerIndex: 0,
					renderFunc: function(field, node, item) {
						node.innerHTML = item.meta['dateProcessed'];
					}
				})
			];
				
			return arr.filter(colDefs, function(cd) {
				return arr.some(this.showColumns, function(sc) {
					return cd.field == sc;
				});
			}, this);
		}
	});
	
	return clazz;
});
