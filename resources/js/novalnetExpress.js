jQuery(document).ready(function() {
    var plentymarketDomain = window.plentymarketDomain || '';

console.log('Plentymarket Domain:', plentymarketDomain);
    // Load the Google Pay button
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
                    countryCode : String(jQuery('#nn_google_pay').attr('data-country')),
                    partnerId: jQuery('#nn_merchant_id').val(),
                },
                transaction: {
                    setPendingPayment: true,
                    amount: String(jQuery('#nn_google_pay').attr('data-total-amount')),
                    currency: String(jQuery('#nn_google_pay').attr('data-currency')),
                    enforce3d: Boolean(jQuery('#nn_enforce').val()),
                    paymentMethod: "GOOGLEPAY",
                    environment: jQuery('#nn_environment').val(),
                },
                custom: {
                    lang: String(jQuery('#nn_google_pay').attr('data-order-lang'))
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
                    locale: ( String(jQuery('#nn_google_pay').attr('data-order-lang')) == 'EN' ) ? "en-US" : "de-DE",
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
                            jQuery('#nn_google_pay_response').val(JSON.stringify(response));
                            jQuery('#nn_currency').val(String(jQuery('#nn_google_pay').attr('data-currency'))); 
                            jQuery('#nn_google_pay_token').val(response.transaction.token);
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
                    onPaymentButtonClicked: function(clickResult) {
                        console.log('click');
                        var id = null;
                        if (typeof window.ceresStore.state.item !== 'undefined' && window.ceresStore.state.item.variation.documents[0]) {
                            id = window.ceresStore.state.item.variation.documents[0].data.variation.id;
                        } else if (typeof window.ceresStore.state.items.mainItemId !== 'undefined' && window.ceresStore.state.items[window.ceresStore.state.items.mainItemId]) {
                            id = window.ceresStore.state.items[window.ceresStore.state.items.mainItemId].variation.documents[0].data.variation.id;
                        }
                        if (id) {
                            var postData = {
                                variationId: id,
                                quantity: jQuery('.add-to-basket-container').find('input[type="text"], input[type="number"]').first().val()
                            };
                            jQuery.post(
                                '/rest/io/basket/items/',
                                postData,
                                function () {
                                    // Refresh the basket after the AJAX request completes successfully
                                    refreshBasket();
                                     jQuery('.basket-container').load();
                                }
                            );
                        
                            // Optionally, you can perform additional actions after adding to basket
                          
                        } else {
                            location.reload();
                        }
                        
                        function refreshBasket() {
                            // Fetch updated basket content and replace it in the DOM
                            jQuery.get('/rest/io/basket/', function (data) {
                                // Replace the basket content in the DOM
                                jQuery('.basket-container').html(data);
                            });
                        }

                        clickResult({status: "SUCCESS"});
                    },
                }
            }
        };
        console.log(requestData);
        NovalnetWalletPaymentObj.setPaymentIntent(requestData);
        // Checking for the Payment method availability
        NovalnetWalletPaymentObj.isPaymentMethodAvailable(function(displayGooglePayButton) {
            if(displayGooglePayButton) {
                // Display the Google Pay payment
                NovalnetWalletPaymentObj.addPaymentButton("#nn_google_pay");
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
