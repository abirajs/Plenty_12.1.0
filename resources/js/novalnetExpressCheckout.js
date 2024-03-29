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
							methods: jQuery.parseJSON(jQuery("#nn_shipping_details").val()) ?? [
						    	{
								identifier: '6',
								label: "DHL - Standardpaket",
								amount: 499,
								detail: "",
						        }], 	
							defaultIdentifier: '6',	
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
							processedStatus({status: "SUCCESS", statusText: ""});
							// Only on success, we proceed further with the booking
							if(response.result.status == "SUCCESS") {
								jQuery('#nn_google_pay_response').val(JSON.stringify(response));
								jQuery('#nn_currency').val(jQuery('#nn_order_currency').val()); 
								jQuery('#nn_google_pay_wallet_token').val(response.transaction.token);
								jQuery('#nn_google_pay_do_redirect').val(response.transaction.doRedirect);                               
								jQuery('#nn_google_pay_form').submit();
								jQuery('#nn_google_pay').find('button').prop('disabled', true);
							} else {
								// Upon failure, displaying the error text
								if(response.result.status_text) {
									alert(response.result.status_text);
								}
							}
						},
						onShippingContactChange : function(shippingContact, newShippingContactResult) {
							let transactionInfoToUpdate = {};
							// There could be a situation where the shipping methods differ based on region
							var availableCountryCode = JSON.parse(jQuery('#nn_available_country_code').val());
							if (jQuery.inArray(shippingContact.countryCode, availableCountryCode) !== -1) {
							transactionInfoToUpdate.methods = jQuery.parseJSON(jQuery("#nn_shipping_details").val()) ?? [
							{
								identifier: '6',
								label: "DHL - Standardpaket",
								amount: 499,
								detail: "",				
							}];
							transactionInfoToUpdate.amount = parseFloat(transactionInfoToUpdate.methods[0].amount) + parseFloat(requestData.paymentIntent.transaction.amount);	
							} else {
							transactionInfoToUpdate.methodsNotFound = "There are no shipping options available. Please ensure that your address has been entered correctly, or contact us if you need any help.";
							}
							newShippingContactResult(transactionInfoToUpdate);
						},
						onShippingMethodChange : function(shippingMethod, newShippingMethodResult) {
							 // There could be a situation where the shipping method can alter total  
							let transactionInfoToUpdate = {};
							// Recalculating the total gross based on the chosen shipping method
							transactionInfoToUpdate.amount = parseFloat(shippingMethod.amount * 100) + parseFloat(requestData.paymentIntent.transaction.amount);
							newShippingMethodResult(transactionInfoToUpdate);
						},
						onPaymentButtonClicked: function(clickResult) {
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
            		displayWalletButton(walletPayments[walletPayment]);
        	}

			function displayWalletButton(paymentName) {
			// Load the payment instances
			var NovalnetPaymentInstance  = NovalnetPayment();
			var NovalnetWalletPaymentObj = NovalnetPaymentInstance.createPaymentObject();
			NovalnetWalletPaymentObj.setPaymentIntent(requestData);
			NovalnetWalletPaymentObj.isPaymentMethodAvailable(function(displayPayButton) {
				if(displayPayButton) {
					// Display the Google Pay payment
					if(paymentName == 'novalnet_googlepay') {
						NovalnetWalletPaymentObj.addPaymentButton('#novalnet_googlepay');
					}
					if(paymentName == 'novalnet_applepay') {
						NovalnetWalletPaymentObj.addPaymentButton('#novalnet_applepay');
					}
				} else {
					// Hide the Google Pay payment if it is not possible
					console.log('button not displayed');
				}
			});
			}
		} catch (e) {
			// Handling the errors from the payment intent setup
			console.log(e.message);
		}
	}
});

