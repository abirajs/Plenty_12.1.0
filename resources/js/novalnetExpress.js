jQuery(document).ready(function() {
    var walletPayments = JSON.parse(jQuery("#nn_wallet_payments").val());

	for (let walletPayment in walletPayments) {
		// Load the Wallet Pay button
		try {
			// Load the payment instances
			var NovalnetPaymentInstance  = NovalnetPayment();
			var NovalnetWalletPaymentObj = NovalnetPaymentInstance.createPaymentObject();
			// Setup the payment intent
			var requestData = {
				clientKey: String(jQuery('#nn_client_key').val()),
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
						enforce3d: Boolean(jQuery('#nn_enforce').val()),
						paymentMethod: walletPayments[walletPayment],
						environment: jQuery('#nn_environment').val(),
					},
					custom: {
						lang: jQuery('#nn_order_lang').val(),
					},
					order: {
						paymentDataPresent: false,
						merchantName: String(jQuery('#nn_business_name').val()),
						billing: {
							requiredFields: ["postalAddress", "phone", "email"]
						},
						shipping: {
							requiredFields: ["postalAddress", "phone"],
							methods: [
							  {
								identifier: "freeshipping",
								amount: 0,
								detail: "Free shipping within Deutschland",				
								label: "Free Shipping"
							  },
							  {
								identifier: "dhlshipping",
								amount: 500,
								detail: "The product will be delivered depends on the executive",
								label: "DHL Shipping"
							  }
							],
							defaultIdentifier: "dhlshipping",	
							methodsUpdatedLater: true
						 }
					},
					button: {
						type: jQuery('#nn_button_type').val(),
						locale: ( String(jQuery('#nn_order_lang').val()) == 'EN' ) ? "en-US" : "de-DE",
						boxSizing: "fill",
						dimensions: {
							height: parseInt(jQuery('#nn_button_height').val())
						}
					},
					callbacks: {
						onProcessCompletion: function (response, processedStatus) {
							processedStatus({status: "SUCCESS", statusText: ""});
							// Only on success, we proceed further with the booking
							if(response.result.status == "SUCCESS") {
								console.log(response);
								// var array = json_decode(response, true);
								if(walletPayments[walletPayment] == 'NOVALNET_GOOGLEPAY') {
								jQuery('#nn_google_pay_response').val(JSON.stringify(response));
								jQuery('#nn_currency').val(jQuery('#nn_order_currency').val()); 
								jQuery('#nn_google_pay_token').val(response.transaction.token);
								jQuery('#nn_google_pay_do_redirect').val(response.transaction.doRedirect);                               
								jQuery('#nn_google_pay_form').submit();
								jQuery('#nn_google_pay').find('button').prop('disabled', true);
								} else {
								jQuery('#nn_apple_pay_response').val(JSON.stringify(response));
								jQuery('#nn_currency').val(jQuery('#nn_order_currency').val()); 
								jQuery('#nn_apple_pay_token').val(response.transaction.token);
								jQuery('#nn_apple_pay_do_redirect').val(response.transaction.doRedirect);                               
								jQuery('#nn_apple_pay_form').submit();
								jQuery('#nn_apple_pay').find('button').prop('disabled', true);
								}                                                
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
						if (shippingContact.countryCode == "DE" || shippingContact.countryCode == "US") {		
							transactionInfoToUpdate.methods = [{
								identifier: "dhlshipping",
								amount: 500,
								detail: "The product will be delivered depends on the executive",
								label: "DHL Shipping"
							}, {
								identifier: "freeshipping",
								amount: 0,
								detail: "Free shipping within Deutschland",
								label: "Free Shipping"
							}];
						} else {
							transactionInfoToUpdate.methods = [{
								identifier: "expressshipping",
								amount: 750,
								detail: "The product will be dispatched in the same day",				
								label: "Express Shipping"
							}];
						}

						// Recalculating the total gross based on the chosen shipping method
						transactionInfoToUpdate.amount = transactionInfoToUpdate.methods[0].amount + requestData.paymentIntent.transaction.amount;	
						newShippingContactResult(transactionInfoToUpdate);
					 },
					 onShippingMethodChange : function(shippingMethod, newShippingMethodResult) {
						 // There could be a situation where the shipping method can alter total  
						let transactionInfoToUpdate = {};
						// Recalculating the total gross based on the chosen shipping method
						transactionInfoToUpdate.amount = (parseInt(shippingMethod.amount) * 100) + requestData.paymentIntent.transaction.amount;
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
							// if (id) {
							// var postData = {
							//     variationId: id,
							//     quantity: jQuery('.add-to-basket-container').find('input[type="text"], input[type="number"]').first().val()
							// };
							// jQuery.post(
							//     '/rest/io/basket/items/',
							//     postData,
							//     function () {
							//        jQuery('.basket-container').load('/rest/io/basket');
							//     }
							// );
							// } else {
							// location.reload();
							// }
							if(walletPayments[walletPayment] == 'NOVALNET_GOOGLEPAY') {
							jQuery('.fa-shopping-cart').parent('button').click();
							clickResult({status: "SUCCESS"});
							} else {
							 jQuery('#nn_apple_pay_form').submit();
							}
							
						},
					}
				}
			};
			console.log(requestData);
			NovalnetWalletPaymentObj.setPaymentIntent(requestData);
			
			// Checking for the Payment method availability
			NovalnetWalletPaymentObj.isPaymentMethodAvailable(function(displayPayButton) {
				if(displayPayButton) {
					if(walletPayments[walletPayment] == 'GOOGLEPAY') {
					// Display the Google Pay payment
					NovalnetWalletPaymentObj.addPaymentButton("#nn_google_pay");
					} else {
					NovalnetWalletPaymentObj.addPaymentButton("#nn_apple");
					}
				} else {
					// Hide the Google Pay payment if it is not possible
					console.log('button not displayed');
				}
				console.log('test4'); 
			});
		} catch (e) {
			// Handling the errors from the payment intent setup
			console.log(e.message);
		}
	}
});
console.log('test5'); 
