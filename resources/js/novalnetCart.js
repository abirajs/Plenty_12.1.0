jQuery(document).ready(function() {
    var plentymarketDomain = window.plentymarketDomain || '';

console.log('Plentymarket Domain:', plentymarketDomain);
    // Load the Google Pay button
    try {
        // Load the payment instances
        var NovalnetPaymentInstance2  = NovalnetPayment();
        var NovalnetWalletPaymentObj2 = NovalnetPaymentInstance2.createPaymentObject();
        // Setup the payment intent
        var requestData2 = {
            clientKey: "88fcbbceb1948c8ae106c3fe2ccffc12",
            paymentIntent: {
                merchant: {
                    paymentDataPresent: false,
                   countryCode: "DE",
	                partnerId: "BCR2DN4T4DTN7FSI"
                },
                transaction: {
                    setPendingPayment: true,
                    amount: 1850,
                	currency: "EUR",	
                	paymentMethod: "GOOGLEPAY",
                	environment: "SANDBOX"
                },
                custom: {
                    lang: "en-US"
                },
                order: {
                    paymentDataPresent: false,
                    merchantName: "Test Development for Google Pay",  
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
                    type: "plain",
                    style: "black",
                    locale: "en-US",
                    boxSizing: "static",
                    dimensions: {
                        height: 45,
                        width: 200
                    }
                },
                callbacks: {
                    onProcessCompletion: function (response, processedStatus) {
                        processedStatus({status: "SUCCESS", statusText: ""});
                        // Only on success, we proceed further with the booking
                        if(response.result.status == "SUCCESS") {
                            console.log(response);
                            jQuery('#google_pay_token').val(response.transaction.token);
                            jQuery('#google_pay_do_redirect').val(response.transaction.doRedirect);                               
                            jQuery('#google_pay_form').submit();
                            jQuery('#nn_google_pay_cart').find('button').prop('disabled', true);
                        } else {
                            // Upon failure, displaying the error text
                            if(response.result.status_text) {
                                console.log(response);
                                alert(response.result.status_text);
                            }
                        }
                    },
                    onPaymentButtonClicked: function(clickResult) {
                           clickResult({status: "SUCCESS"});
                           alert('ok');
                    },
                }
            }
        };
        console.log(requestData2);
        NovalnetWalletPaymentObj2.setPaymentIntent(requestData2);
        // Checking for the Payment method availability
	console.log('11');
        NovalnetWalletPaymentObj2.isPaymentMethodAvailable(function(displayGooglePayButton) {
	console.log('22');
            if(displayGooglePayButton) {
		    console.log('33');
                // Display the Google Pay payment
                NovalnetWalletPaymentObj2.addPaymentButton("#nn_google_pay_cart");
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

});
console.log('test5'); 
