jQuery(document).ready(function() {
    console.log('0');
    // Load the Google Pay button
    try {
        console.log('1');
        // Load the payment instances
        var NovalnetPaymentInstance  = NovalnetPayment();
        var NovalnetWalletPaymentObj = NovalnetPaymentInstance.createPaymentObject();
        // Setup the payment intent
        var requestData = {
            clientKey: String(jQuery('#nn_client_key_cart').val()),
            paymentIntent: {
                merchant: {
                    paymentDataPresent: false,
                    countryCode : String(jQuery('#nn_google_pay_cart').attr('data-country')) ? String(jQuery('#nn_google_pay_cart').attr('data-country')) : 'DE',
                    partnerId: jQuery('#nn_merchant_id').val(),
                },
                transaction: {
                    setPendingPayment: true,
                    amount: String(jQuery('#nn_google_pay_cart').attr('data-total-amount')) ? String(jQuery('#nn_google_pay_cart').attr('data-total-amount')) : '100',
                    currency: String(jQuery('#nn_google_pay_cart').attr('data-currency')) ? String(jQuery('#nn_google_pay_cart').attr('data-currency')) : 'EUR',
                    enforce3d: Boolean(jQuery('#nn_enforce').val()),
                    paymentMethod: "GOOGLEPAY",
                    environment: jQuery('#nn_environment').val(),
                },
                custom: {
                    lang: String(jQuery('#nn_google_pay_cart').attr('data-order-lang'))
                },
                order: {
                    paymentDataPresent: false,
                    merchantName: String(jQuery('#nn_business_name').val()),
                    billing: {
                    	requiredFields: ["postalAddress", "phone", "email"]
                    },
                    shipping: {
                    	requiredFields: ["postalAddress", "phone"],
                     }
                },
                button: {
                    type: jQuery('#nn_button_type').val(),
                    locale: ( String(jQuery('#nn_google_pay_cart').attr('data-order-lang')) == 'EN' ) ? "en-US" : "de-DE",
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
                            jQuery('#nn_google_pay_token').val(response.transaction.token);
                            jQuery('#nn_google_pay_do_redirect').val(response.transaction.doRedirect);                               
                            jQuery('#nn_google_pay_form').submit();
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
                    },
                }
            }
        };
        console.log(requestData);
        NovalnetWalletPaymentObj.setPaymentIntent(requestData);
        // Checking for the Payment method availability
        NovalnetWalletPaymentObj.isPaymentMethodAvailable(function(displayGooglePayButton) {
            console.log('2');
            if(displayGooglePayButton) {
                // Display the Google Pay payment
                NovalnetWalletPaymentObj.addPaymentButton("#nn_google_pay_cart");
            } else {
                // Hide the Google Pay payment if it is not possible
                console.log('button not displayed');
            }
            console.log('test3'); 
        });
    } catch (e) {
        // Handling the errors from the payment intent setup
        console.log(e.message);
    }
});
console.log('test4'); 
