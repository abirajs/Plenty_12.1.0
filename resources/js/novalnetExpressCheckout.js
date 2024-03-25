jQuery(document).ready(function() {
    var walletPayments = JSON.parse(jQuery("#nn_wallet_payments").val());
    var configurationData = JSON.parse(jQuery("#nn_configuration_data").val());
    $('<input type="hidden" id="nn_google_pay_wallet_token">').appendTo('#nn_google_pay_button');
	for (let walletPayment in walletPayments) {
		var paymentTypeValue = ( walletPayments[walletPayment] == 'novalnet_googlepay' ) ? 'GOOGLEPAY' : 'APPLEPAY';
		// Load the Wallet Pay button
		try {
			// Setup the payment intent
			var requestData = {
				clientKey: configurationData[paymentTypeValue].client_key,
				paymentIntent: {
					merchant: {
						paymentDataPresent: false,
						countryCode : jQuery('#nn_country_code').val(),
						partnerId: jQuery('#nn_merchant_id').val(),
					},
					transaction: {
						setPendingPayment: true,
						amount: (String(jQuery('#nn_order_amount').val()) != '') ? String(jQuery('#nn_order_amount').val()) : ((window.ceresStore.state.items[window.ceresStore.state.items.mainItemId].variation.documents[0].data.prices.default.price.value).toFixed(2)) * jQuery('.add-to-basket-container').find('input[type="text"], input[type="number"]').first().val() * 100,
						currency: jQuery('#nn_order_currency').val(),
						enforce3d: (jQuery('#nn_enforce').val() == 'on') ? true : false,
						paymentMethod: ( walletPayments[walletPayment] == 'novalnet_googlepay' ) ? 'GOOGLEPAY' : 'APPLEPAY' ,
						environment: (configurationData[paymentTypeValue].testmode == 'SANDBOX') ? "SANDBOX" : "PRODUCTION",
					},
					custom: {
						lang: jQuery('#nn_order_lang').val(),
					},
					order: {
						paymentDataPresent: false,
						merchantName: configurationData[paymentTypeValue].seller_name,
						billing: {
							requiredFields: ["postalAddress", "phone", "email"]
						},
						shipping: {
							requiredFields: ["postalAddress", "phone"],
							// methods: [
							//   {
							// 	identifier: "freeshipping",
							// 	amount: 0,
							// 	detail: "Free shipping within Deutschland",				
							// 	label: "Free Shipping"
							//   },
							//   {
							// 	identifier: "dhlshipping",
							// 	amount: 500,
							// 	detail: "The product will be delivered depends on the executive",
							// 	label: "DHL Shipping"
							//   }
							// ],
							methods: jQuery.parseJSON(jQuery("#nn_shipping_details").val()), 	
							defaultIdentifier: "Standardpaket",	
							methodsUpdatedLater: true
						},	
					},
					button: {
						type: configurationData[paymentTypeValue].button_type,
						locale: ( String(jQuery('#nn_order_lang').val()) == 'EN' ) ? "en-US" : "de-DE",
						boxSizing: "fill",
						dimensions: {
							height: configurationData[paymentTypeValue].button_height,
						}
					},
					callbacks: {
						onProcessCompletion: function (response, processedStatus) {
							console.log(response);
							processedStatus({status: "SUCCESS", statusText: ""});
							// Only on success, we proceed further with the booking
							if(response.result.status == "SUCCESS") {
								console.log(response);
								jQuery('#nn_google_pay_response').val(JSON.stringify(response));
								jQuery('#nn_currency').val(jQuery('#nn_order_currency').val()); 
								jQuery('#nn_google_pay_wallet_token').val(response.transaction.token);
								jQuery('#nn_google_pay_do_redirect').val(response.transaction.doRedirect);                               
								jQuery('#nn_google_pay_form').submit();
								jQuery('#nn_google_pay').find('button').prop('disabled', true);
							} else {
								// Upon failure, displaying the error text
								if(response.result.status_text) {
									console.log(response);
									alert(response.result.status_text);
								}
							}
						},
						
						onShippingContactChange : function(shippingContact, newShippingContactResult) {
						let transactionInfoToUpdate = {};
						// There could be a situation where the shipping methods differ based on region
						// if (shippingContact.countryCode == "DE" || shippingContact.countryCode == "US") {		
							// transactionInfoToUpdate.methods = [{
							// 	identifier: "dhlshipping",
							// 	amount: 500,
							// 	detail: "The product will be delivered depends on the executive",
							// 	label: "DHL Shipping"
							// }, {
							// 	identifier: "freeshipping",
							// 	amount: 0,
							// 	detail: "Free shipping within Deutschland",
							// 	label: "Free Shipping"
							// }];
						// } else {
						// 	transactionInfoToUpdate.methods = [{
						// 		identifier: "expressshipping",
						// 		amount: 750,
						// 		detail: "The product will be dispatched in the same day",				
						// 		label: "Express Shipping"
						// 	}];
						// }
						if (shippingContact.countryCode) {
						transactionInfoToUpdate.methods = jQuery.parseJSON(jQuery("#nn_shipping_details").val());
						} else {
						transactionInfoToUpdate.methodsNotFound = "There are no shipping options available. Please ensure that your address has been entered correctly, or contact us if you need any help.";	
						}
							
						console.log(transactionInfoToUpdate.methods);
						// Recalculating the total gross based on the chosen shipping method	
						transactionInfoToUpdate.amount = (transactionInfoToUpdate.methods[0].amount) + (requestData.paymentIntent.transaction.amount);	
						newShippingContactResult(transactionInfoToUpdate);
					 },
					 onShippingMethodChange : function(shippingMethod, newShippingMethodResult) {
						 console.log(parseInt(shippingMethod.amount));
						 console.log(shippingMethod.amount * 100);
						 console.log(requestData.paymentIntent.transaction.amount);
						 // There could be a situation where the shipping method can alter total  
						let transactionInfoToUpdate = {};
						// Recalculating the total gross based on the chosen shipping method
						transactionInfoToUpdate.amount = ( shippingMethod.amount * 100 ) + requestData.paymentIntent.transaction.amount;
						newShippingMethodResult(transactionInfoToUpdate);
					 },
						
					 onPaymentButtonClicked: function(clickResult) {
							console.log('click');
							console.log(window.ceresStore.state);
							console.log(window.ceresStore.state.basket.item);
							var id = null;
							if (typeof window.ceresStore.state.item !== 'undefined' && window.ceresStore.state.item.variation.documents[0]) {
							id = window.ceresStore.state.item.variation.documents[0].data.variation.id;
							} else if (typeof window.ceresStore.state.items.mainItemId !== 'undefined' && window.ceresStore.state.items[window.ceresStore.state.items.mainItemId]) {
							id = window.ceresStore.state.items[window.ceresStore.state.items.mainItemId].variation.documents[0].data.variation.id;
							}
							if(walletPayments[walletPayment] == 'novalnet_applepay')  {
							     if (jQuery('.widget-basket-totals').length <= 0) {
							 	jQuery('.fa-shopping-cart').parent('button').click();
							     } 

							 window.location.href = jQuery('#nn_payment_process_url').val();
							}
						 	if(walletPayments[walletPayment] == 'novalnet_googlepay') {
							    if (jQuery('.widget-basket-totals').length <= 0) {
							 	jQuery('.fa-shopping-cart').parent('button').click();
							     } 
							     clickResult({status: "SUCCESS"});
							} 
							
						},
					}
				}
			};
			
			// Checking for the Payment method availability
			if((walletPayments[walletPayment] == "novalnet_googlepay") || (walletPayments[walletPayment] == "novalnet_applepay")) {
				console.log(walletPayments[walletPayment]);
            			displayWalletButton(walletPayments[walletPayment]);
        		}

			function displayWalletButton(paymentName) {
			// Load the payment instances
			var NovalnetPaymentInstance  = NovalnetPayment();
			var NovalnetWalletPaymentObj = NovalnetPaymentInstance.createPaymentObject();
			NovalnetWalletPaymentObj.setPaymentIntent(requestData);
			console.log(requestData);
			NovalnetWalletPaymentObj.isPaymentMethodAvailable(function(displayPayButton) {
				console.log('paymentMethodAvailable');
				if(displayPayButton) {
					console.log(paymentName);
					// Display the Google Pay payment
					if(paymentName == 'novalnet_googlepay') {
						console.log('novalnet_googlepay' + paymentName);
					       NovalnetWalletPaymentObj.addPaymentButton('#novalnet_googlepay');
					}
					if(paymentName == 'novalnet_applepay') {
						console.log('novalnet_googlepay' + paymentName);
						NovalnetWalletPaymentObj.addPaymentButton('#novalnet_applepay');
					}
				} else {
					// Hide the Google Pay payment if it is not possible
					console.log('button not displayed');
				}
				console.log('test4'); 
			});
			}
		} catch (e) {
			// Handling the errors from the payment intent setup
			console.log(e.message);
		}
	}

    //  if ((jQuery('#nn_wallet_payments').val() != '')) { 
    //     jQuery("#nn_google_pay").hide(); 
    //     jQuery('.fa-arrow-right').parent('button').show(); 
    // }
});
console.log('test5'); 
