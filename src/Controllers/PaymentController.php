<?php
/**
 * This module is used for handling the redirect Url process
 *
 * @author       Novalnet AG
 * @copyright(C) Novalnet
 * @license      https://www.novalnet.de/payment-plugins/kostenlos/lizenz
 */

namespace Novalnet\Controllers;

use Plenty\Plugin\Controller;
use Plenty\Plugin\Http\Request;
use Plenty\Plugin\Http\Response;
use Novalnet\Providers\NovalnetServiceProvider;
use Novalnet\Services\PaymentService;
use Novalnet\Helper\PaymentHelper;
use Novalnet\Services\SettingsService;
use Plenty\Modules\Frontend\Session\Storage\Contracts\FrontendSessionStorageFactoryContract;
use Plenty\Modules\Basket\Contracts\BasketRepositoryContract;
use Plenty\Modules\Account\Address\Models\Address;
use Plenty\Plugin\Templates\Twig;
use Plenty\Plugin\Log\Loggable;
use Plenty\Modules\Frontend\Contracts\Checkout;

use Plenty\Modules\Order\Shipping\Countries\Contracts\CountryRepositoryContract;
use Plenty\Modules\Order\Shipping\Countries\Models\Country;
use Plenty\Modules\Account\Address\Models\AddressOption;
use Plenty\Modules\Account\Address\Contracts\AddressRepositoryContract;
use Plenty\Modules\Account\Contact\Contracts\ContactAddressRepositoryContract;
use Plenty\Modules\Frontend\Services\AccountService;
use Plenty\Modules\Account\Address\Models\AddressRelationType;
use Plenty\Modules\Frontend\Services\CheckoutService;
use Plenty\Plugin\Events\Dispatcher;
use Plenty\Modules\Frontend\Contracts\CheckoutRepositoryContract;

/**
 * Class PaymentController
 *
 * @package Novalnet\Controllers
 */
class PaymentController extends Controller
{
    use Loggable;
    /**
     * @var Request
     */
    private $request;

    /**
     * @var Response
     */
    private $response;

    /**
     * @var PaymentService
     */
    private $paymentService;

    /**
     * @var PaymentHelper
     */
    private $paymentHelper;

    /**
     * @var SettingsService
    */
    private $settingsService;

    /**
     * @var FrontendSessionStorageFactoryContract
     */
    private $sessionStorage;

    /**
     * @var BasketRepositoryContract
     */
    private $basketRepository;

    /**
     * @var Twig
     */
    private $twig;

    /**
     * @var AddressRepositoryContract
     */
    private $addressContract;

    /**
     * @var Checkout
     */
    private $checkout;

    /**
     * @var Checkout
     */
    private $checkoutService;

    /**
     * @var Checkout
     */
    private $checkoutRepository;
    
    /**
     * Constructor.
     *
     * @param Request $request
     * @param Response $response
     * @param PaymentService $paymentService
     * @param PaymentHelper $paymentHelper
     * @param SettingsService $settingsService
     * @param FrontendSessionStorageFactoryContract $sessionStorage
     * @param BasketRepositoryContract $basketRepository
     * @param Twig $twig
     */
    public function __construct(Request $request,
                                Response $response,
                                PaymentService $paymentService,
                                PaymentHelper $paymentHelper,
                                SettingsService $settingsService,
                                FrontendSessionStorageFactoryContract $sessionStorage,
                                BasketRepositoryContract $basketRepository,
                                AddressRepositoryContract $addressRepositoryContract,
                                Checkout $checkout,
                                Twig $twig,
				CheckoutService $checkoutService,
				CheckoutRepositoryContract $checkoutRepository
				
                               )
    {
        $this->request          = $request;
        $this->response         = $response;
        $this->paymentService   = $paymentService;
        $this->paymentHelper    = $paymentHelper;
        $this->settingsService  = $settingsService;
        $this->sessionStorage   = $sessionStorage;
        $this->basketRepository = $basketRepository;
        $this->twig             = $twig;
	$this->checkoutService  = $checkoutService;    
        
        $this->addressContract = $addressRepositoryContract;
        $this->checkout = $checkout;
	$this->checkoutRepository = $checkoutRepository;
    }

    /**
     * Novalnet redirects to this page if the payment was executed successfully
     *
     */
    public function paymentResponse()
    {
        // Get the initial payment call response
        $paymentResponseData = $this->request->all();
        // Checksum validation for redirects
        if(!empty($paymentResponseData['tid'])) {
            if($paymentResponseData['status'] == 'SUCCESS') {
                // Checksum validation and transaction status call to retrieve the full response
                $paymentResponseData = $this->paymentService->validateChecksumAndGetTxnStatus($paymentResponseData);

                // Checksum validation is failure return back to the customer to confirmation page with error message
                if(!empty($paymentResponseData['nn_checksum_invalid'])) {
                    $this->paymentService->pushNotification($paymentResponseData['nn_checksum_invalid'], 'error', 100);
                    return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/confirmation');
                }

                // Retrieve the full payment response
                $paymentResponseData = $this->paymentService->getFullTxnResponse($paymentResponseData);
                $isPaymentSuccess = isset($paymentResponseData['result']['status']) && $paymentResponseData['result']['status'] == 'SUCCESS';
                if($isPaymentSuccess) {
                    $this->paymentService->pushNotification($paymentResponseData['result']['status_text'], 'success', 100);
                } else {
                    $this->paymentService->pushNotification($paymentResponseData['result']['status_text'], 'error', 100);
                    if($this->settingsService->getPaymentSettingsValue('novalnet_order_creation') != true) {
                        return $this->response->redirectTo('checkout');
                    }
                }
            } else {
                $this->paymentService->pushNotification($paymentResponseData['status_text'], 'error', 100);
                if($this->settingsService->getPaymentSettingsValue('novalnet_order_creation') != true) {
                  return $this->response->redirectTo('checkout');
                }
            }
            $paymentRequestData = $this->sessionStorage->getPlugin()->getValue('nnPaymentData');
            // Set the payment response in the session for the further processings
            $this->sessionStorage->getPlugin()->setValue('nnPaymentData', array_merge($paymentRequestData, $paymentResponseData));
            if($this->settingsService->getPaymentSettingsValue('novalnet_order_creation') != true && !isset($paymentResponseData['transaction']['order_no'])) {
                // Call the shop executePayment function
                return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/place-order');
            }
            // Handle the further process to the order based on the payment response
            $this->paymentService->HandlePaymentResponse();
            return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/confirmation');

        } else {
            $this->paymentService->pushNotification($paymentResponseData['status_text'], 'error', 100);
            if($this->settingsService->getPaymentSettingsValue('novalnet_order_creation') != true) {
                  return $this->response->redirectTo('checkout');
            } else {
                return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/confirmation');
            }
        }
    }

    /**
     * Process the Form payment
     *
     */
    public function processPayment()
    {
        // Get the payment form post data
        $paymentRequestPostData = $this->request->all();
        $this->getLogger(__METHOD__)->error('Novalnet::ProcessPaymentRequest', $paymentRequestPostData);
	// if($sessionStorage->getPlugin()->getValue('test') == 'test') {
	//     $paymentRequestPostData = $sessionStorage->getPlugin()->getValue('postData');
	//      $this->getLogger(__METHOD__)->error('Novalnet::postData', $paymentRequestPostData);
	//      $sessionStorage->getPlugin()->setValue('postData', null);
	//      $sessionStorage->getPlugin()->setValue('test', null);
	// }
        // Get the order amount
        $orderAmount = !empty($paymentRequestPostData['nn_order_amount']) ? $paymentRequestPostData['nn_order_amount'] : 0;
        // Get instalment selected option key value
        $selectedOption = $paymentRequestPostData['nn_instalment_cycle'];
        list($key, $value) = explode("-", $selectedOption);
        // Get the payment request params
        $paymentRequestData = $this->paymentService->generatePaymentParams($this->basketRepository->load(), $paymentRequestPostData['nn_payment_key'], $orderAmount);
        // Setting up the account data to the server for SEPA processing
        if(in_array($paymentRequestPostData['nn_payment_key'], ['NOVALNET_SEPA', 'NOVALNET_GUARANTEED_SEPA', 'NOVALNET_INSTALMENT_SEPA'])) {
            $paymentRequestData['paymentRequestData']['transaction']['payment_data'] = ['iban'  => $paymentRequestPostData['nn_sepa_iban']];
            if(!empty($paymentRequestPostData['nn_sepa_bic'])) {
                $paymentRequestData['paymentRequestData']['transaction']['payment_data']['bic'] = $paymentRequestPostData['nn_sepa_bic'];
            }
        }
        // Setting up the account data to the server for ACH processing
        if($paymentRequestPostData['nn_payment_key'] == 'NOVALNET_ACH') {
                $paymentRequestData['paymentRequestData']['transaction']['payment_data']['account_holder'] = $paymentRequestPostData['nn_ach_account_holder'];
                $paymentRequestData['paymentRequestData']['transaction']['payment_data']['account_number'] = $paymentRequestPostData['nn_ach_account_number'];
                $paymentRequestData['paymentRequestData']['transaction']['payment_data']['routing_number'] = $paymentRequestPostData['nn_ach_routing_number'];

        }
        // Setting up the mobile number to the server for MBWAY processing
        if($paymentRequestPostData['nn_payment_key'] == 'NOVALNET_MBWAY') {
            $paymentRequestData['paymentRequestData']['customer']['mobile'] = $paymentRequestPostData['nn_mbway_mobile_number'];
            $paymentRequestData['paymentRequestData']['transaction']['return_url'] = $this->paymentService->getReturnPageUrl();
            $this->sessionStorage->getPlugin()->setValue('nnDoRedirect', 'true');
        }
        // Setting up the birthday for guaranteed payments
        if(in_array($paymentRequestPostData['nn_payment_key'], ['NOVALNET_GUARANTEED_INVOICE', 'NOVALNET_GUARANTEED_SEPA']) && !empty($paymentRequestPostData['nn_show_dob'])) {
            $paymentRequestData['paymentRequestData']['customer']['birth_date'] = sprintf('%4d-%02d-%02d', $paymentRequestPostData['nn_guarantee_year'], $paymentRequestPostData['nn_guarantee_month'], $paymentRequestPostData['nn_guarantee_date']);
        }
        // Setting up the cycle and birht date for instalment payments
        if(in_array($paymentRequestPostData['nn_payment_key'], ['NOVALNET_INSTALMENT_INVOICE', 'NOVALNET_INSTALMENT_SEPA']) ) {
            $paymentRequestData['paymentRequestData']['instalment']['cycles'] = $key;
            if(!empty($paymentRequestPostData['nn_show_dob'])) {
                $paymentRequestData['paymentRequestData']['customer']['birth_date'] = sprintf('%4d-%02d-%02d', $paymentRequestPostData['nn_instalment_year'], $paymentRequestPostData['nn_instalment_month'], $paymentRequestPostData['nn_instalment_date']);
            }
        }
        // Setting up the alternative card data to the server for card processing
        if($paymentRequestPostData['nn_payment_key'] == 'NOVALNET_CC') {
            $paymentRequestData['paymentRequestData']['transaction']['payment_data'] = [
                'pan_hash'   => $paymentRequestPostData['nn_pan_hash'],
                'unique_id'  => $paymentRequestPostData['nn_unique_id']
            ];
            // Set the Do redirect value into session for the redirection
            $this->sessionStorage->getPlugin()->setValue('nnDoRedirect', $paymentRequestPostData['nn_cc3d_redirect']);
        }
        // Setting up the wallet token for the Google pay payment
        if($paymentRequestPostData['nn_payment_key'] == 'NOVALNET_GOOGLEPAY') {
            $paymentRequestData['paymentRequestData']['transaction']['payment_data'] = ['wallet_token'  => $paymentRequestPostData['nn_google_pay_token']];
            // Set the Do redirect value into session for the Google Pay redirection
             $this->sessionStorage->getPlugin()->setValue('nnGooglePayDoRedirect', $paymentRequestPostData['nn_google_pay_do_redirect']);
        }
        // Call the order creation function for the redirection
        if(!empty($paymentRequestPostData['nn_cc3d_redirect']) || $paymentRequestPostData['nn_payment_key'] == 'NOVALNET_MBWAY' || (!empty($paymentRequestPostData['nn_google_pay_do_redirect']) && (string) $paymentRequestPostData['nn_google_pay_do_redirect'] === 'true')) {
            $paymentRequestData['paymentRequestData']['transaction']['return_url'] = $this->paymentService->getReturnPageUrl();
            $this->sessionStorage->getPlugin()->setValue('nnPaymentData', $paymentRequestData);
            if(!empty($paymentRequestPostData['nn_reinitializePayment']) || $this->settingsService->getPaymentSettingsValue('novalnet_order_creation') != true) {
                return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/payment/novalnet/redirectPayment');
            }
                // Call the shop executePayment function
                return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/place-order');
        }
        // Set the payment requests in the session for the further processings
        $this->sessionStorage->getPlugin()->setValue('nnPaymentData', $paymentRequestData);
        if(!empty($paymentRequestPostData['nn_reinitializePayment'])) {
            $this->paymentService->performServerCall();
            return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/confirmation');
        } else {
            if($this->settingsService->getPaymentSettingsValue('novalnet_order_creation') != true) {
                $paymentResponseData = $this->paymentService->performServerCall();
                if(!empty($paymentResponseData) && $paymentResponseData['result']['status'] != 'SUCCESS') {
                    $this->sessionStorage->getPlugin()->setValue('nnDoRedirect', null);
            $this->sessionStorage->getPlugin()->setValue('nnGooglePayDoRedirect', null);
                    $this->paymentService->pushNotification($paymentResponseData['result']['status_text'], 'error', 100);
                    // return back to the customer on checkout page
                    return $this->response->redirectTo('checkout');
                }
            }
            // Call the shop executePayment function
            return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/place-order');
        }
    }

    /**
     * Process the direct payment methods when the change payment method option used
     *
     */
    public function directPaymentProcess()
    {
        $this->sessionStorage->getPlugin()->setValue('nnReinitiatePayment', '1');
        $this->paymentService->performServerCall();
    }

    /**
     * Process the redirect payment methods when the change payment method option used
     *
     */
    public function redirectPayment()
    {
        $postData = $this->request->all();
        if($postData['nnReinitiatePayment']) {
        $this->sessionStorage->getPlugin()->setValue('nnReinitiatePayment', '1');
        }
        $paymentRequestData = $this->sessionStorage->getPlugin()->getValue('nnPaymentData');
        if((empty($paymentRequestData['paymentRequestData']['customer']['first_name']) || empty($paymentRequestData['paymentRequestData']['customer']['last_name'])) || empty($paymentRequestData['paymentRequestData']['customer']['email'])) {
            $content = $this->paymentHelper->getTranslatedText('nn_first_last_name_error');
             $this->paymentService->pushNotification($content, 'error', 100);
           if(empty($paymentRequestData['paymentRequestData']['customer']['email'])) {
            $content = $this->paymentHelper->getTranslatedText('nn_email_error');
             $this->paymentService->pushNotification($content, 'error', 100);
            }
           return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/confirmation');
        }
        $paymentResponseData = $this->paymentService->performServerCall();
        $paymentKey = $this->sessionStorage->getPlugin()->getValue('paymentkey');
        $nnDoRedirect = $this->sessionStorage->getPlugin()->getValue('nnDoRedirect');
        $nnGooglePayDoRedirect = $this->sessionStorage->getPlugin()->getValue('nnGooglePayDoRedirect');
        $this->sessionStorage->getPlugin()->setValue('nnDoRedirect', null);
        $this->sessionStorage->getPlugin()->setValue('nnGooglePayDoRedirect', null);
        if($this->paymentService->isRedirectPayment($paymentKey) || !empty($nnDoRedirect) || (!empty($nnGooglePayDoRedirect) && (string) $nnGooglePayDoRedirect === 'true')) {
            if(!empty($paymentResponseData) && !empty($paymentResponseData['result']['redirect_url']) && !empty($paymentResponseData['transaction']['txn_secret'])) {
                // Transaction secret used for the later checksum verification
                $this->sessionStorage->getPlugin()->setValue('nnTxnSecret', $paymentResponseData['transaction']['txn_secret']);
                return $this->twig->render('Novalnet::NovalnetPaymentRedirectForm',
                        [
                            'nnPaymentUrl' => $paymentResponseData['result']['redirect_url']
                        ]);
            } else {
                // Redirect to confirmation page
                $this->paymentService->pushNotification($paymentResponseData['result']['status_text'], 'error', 100);
                return $this->response->redirectTo($this->sessionStorage->getLocaleSettings()->language . '/confirmation');
            }
        }
    }
  
   public function applePayment()
   {
	$basket = $this->basketRepository->load();
	$this->getLogger(__METHOD__)->error('APPLEBASKET', $basket);
	$checkoutData = pluginApp(\Plenty\Modules\Frontend\Contracts\Checkout::class);
	if($checkoutData instanceof Checkout) {
	    $selectedPaymentMethodId = $this->paymentHelper->getPaymentMethodByKey('NOVALNET_APPLEPAY');
	    if(isset($selectedPaymentMethodId[0]) && $selectedPaymentMethodId[0] > 0) {
	        $checkoutData->setPaymentMethodId((int)$selectedPaymentMethodId[0]);
	        $this->getLogger(__METHOD__)->error('Payment method set to NOVALNET_APPLEPAY', $selectedPaymentMethodId[0]);
	    } else {
	        $this->getLogger(__METHOD__)->error('Failed to get payment method ID for NOVALNET_APPLEPAY',  $selectedPaymentMethodId[0]);
	    }
	} else {
	    $this->getLogger(__METHOD__)->error('Checkout instance not available',  $selectedPaymentMethodId[0]);
	}
	
	return $this->response->redirectTo('checkout');
    }

	
    public function expressPayment()
    {
        // Get the payment form post data
        $paymentRequestPostData = $this->request->all();
	$this->getLogger(__METHOD__)->error('Novalnet::$paymentRequestPostData', $paymentRequestPostData);
	// if(isset($paymentRequestPostData['nn_google_pay_response'])) {

	// }
   
	$basket = $this->basketRepository->load();
	$checkout = pluginApp(\Plenty\Modules\Frontend\Contracts\Checkout::class);
	$this->getLogger(__METHOD__)->error('Novalnet::$basketExpress', $basket);
        if($checkout instanceof Checkout)
        {
            $selectedPaymentMethodId =  (isset($paymentRequestPostData['nn_google_pay_response'])) ? $this->paymentHelper->getPaymentMethodByKey('NOVALNET_GOOGLEPAY') : $this->paymentHelper->getPaymentMethodByKey('NOVALNET_APPLEPAY');
	    $this->getLogger(__METHOD__)->error('Novalnet::$paymentMethodId', $selectedPaymentMethodId[0]);
            if($selectedPaymentMethodId[0] > 0)
            {
                $checkout->setPaymentMethodId((int)$selectedPaymentMethodId[0]);
		$this->getLogger(__METHOD__)->error('Novalnet::setPaymentMethodId', 'setPaymentMethodId');
		if(!isset($paymentRequestPostData['nn_google_pay_response'])) {
			return $this->response->redirectTo('checkout');
		}
            }
	}
	if(isset($paymentRequestPostData['nn_google_pay_response'])) {
		$test = json_decode(json_encode($paymentRequestPostData['nn_google_pay_response']));
	        $array = json_decode($test, true);
	        $arrayTest = (array) $array;
	        $this->getLogger(__METHOD__)->error('Novalnet::$array', $array);
	        $this->getLogger(__METHOD__)->error('Novalnet::$arrayTest', $arrayTest);  
		$this->sessionStorage->getPlugin()->setValue('test','test');
		$this->sessionStorage->getPlugin()->setValue('postData',$arrayTest);
	}
	    
  //       // Get the checkout object
  //       $checkout = pluginApp(\Plenty\Modules\Frontend\Contracts\CheckoutRepositoryContract::class);

  //       // Check if the checkout object is valid
  //       if ($checkout instanceof Checkout) {
  //           // Get all available payment methods
  //           $paymentMethods = $checkout->getPaymentMethods();

  //           // Loop through all payment methods
  //           foreach ($paymentMethods as $paymentMethod) {
  //               // Get the ID of the current payment method
  //               $currentPaymentMethodId = $paymentMethod->getId();
		// if ($currentPaymentMethodId === $selectedPaymentMethodId[0]) {
		// 	$paymentMethod->setEnabled(true);
		// } else {
		// 	$paymentMethod->setEnabled(false);
		// }
  //           }
  //       }
			
	
	$this->getLogger(__METHOD__)->error('Novalnet::checkout', 'checkout');


	$address = pluginApp(\Plenty\Modules\Account\Address\Models\Address::class);
	
	// Set address details
	$address->name2 = $arrayTest['order']['shipping']['contact']['firstName'];
	$address->name3 = $arrayTest['order']['shipping']['contact']['lastName'];
	$address->address1 = $arrayTest['order']['shipping']['contact']['addressLines'];
	$address->address2 = $arrayTest['order']['shipping']['contact']['addressLines'];
	$address->town = $arrayTest['order']['shipping']['contact']['locality'];
	$address->postalCode = $arrayTest['order']['shipping']['contact']['postalCode'];
	
	// Retrieve country ID
	$countryContract = pluginApp(\Plenty\Modules\Order\Shipping\Countries\Contracts\CountryRepositoryContract::class);
	$country = $countryContract->getCountryByIso($arrayTest['order']['shipping']['contact']['countryCode'], 'isoCode2');
	$address->countryId = $country->id;
	
	// Set address options
	$addressOptions = [];
	
	// Set email address as an option
	$addressOption = pluginApp(\Plenty\Modules\Account\Address\Models\AddressOption::class);
	$addressOption->typeId = \Plenty\Modules\Account\Address\Models\AddressOption::TYPE_EMAIL;
	$addressOption->value = $arrayTest['order']['billing']['contact']['email']; // Assuming $email is defined elsewhere
	$addressOptions[] = $addressOption->toArray();
	
	// Set options as an array
	$address->options = $addressOptions;
	
	// Create or update the address
	$accountService = pluginApp(\Plenty\Modules\Frontend\Services\AccountService::class);
	$contactId = $accountService->getAccountContactId();
	
	if (!empty($contactId) && $contactId > 0) {
	// If a contact ID is available, create the address for the contact
	$contactAddress = pluginApp(\Plenty\Modules\Account\Contact\Contracts\ContactAddressRepositoryContract::class);
	$createdAddress = $contactAddress->createAddress($address->toArray(), $contactId, AddressRelationType::DELIVERY_ADDRESS);
	} else {
	// If no contact ID is available, create the address independently
	$createdAddress = $this->addressContract->createAddress($address->toArray());
	// Set the customer invoice address ID if not already set
	if (empty($this->checkout->getCustomerInvoiceAddressId())) {
	$this->checkout->setCustomerInvoiceAddressId($createdAddress->id);
	}
	}
	
	// Set the customer shipping address ID
	$this->checkout->setCustomerShippingAddressId($createdAddress->id);

        $payment_access_key  = $this->settingsService->getPaymentSettingsValue('novalnet_private_key');
        $encoded_data        = base64_encode($payment_access_key);
        $endpoint            = 'https://payport.novalnet.de/v2/payment';
        $headers = [
            'Content-Type:application/json',
            'Charset:utf-8', 
            'Accept:application/json', 
            'X-NN-Access-Key:' . $encoded_data, 
        ];
        
       $data = [];
        
        $data['merchant'] = [
            'signature' => $this->settingsService->getPaymentSettingsValue('novalnet_public_key'), 
            'tariff'    => $this->settingsService->getPaymentSettingsValue('novalnet_tariff_id'), 
        ];
        
        $data['customer'] = [
            'first_name'  => $arrayTest['order']['billing']['contact']['firstName'],
            'last_name'   => $arrayTest['order']['billing']['contact']['lastName'], 
            'email'       => $arrayTest['order']['billing']['contact']['email'], 
            'customer_ip' => '192.168.2.125',
            'customer_no' => 'guest',
	    'gender'      => 'u',
            'billing'     => [
                'house_no'     => $arrayTest['order']['billing']['contact']['addressLines'],
                'street'       => $arrayTest['order']['billing']['contact']['addressLines'],
                'city'         => $arrayTest['order']['billing']['contact']['locality'],
                'zip'          => $arrayTest['order']['billing']['contact']['postalCode'],
                'country_code' => $arrayTest['order']['billing']['contact']['countryCode'],
        	    'company'   => 'ABC GmbH',
        	    'state'      => 'Berlin'
            ] ,  
             
            'shipping' => [
		'first_name'  => $arrayTest['order']['shipping']['contact']['firstName'],
		'last_name'   => $arrayTest['order']['shipping']['contact']['lastName'], 
                'house_no'     => $arrayTest['order']['shipping']['contact']['addressLines'],
                'street'       => $arrayTest['order']['shipping']['contact']['addressLines'],
                'city'         => $arrayTest['order']['shipping']['contact']['locality'],
                'zip'          => $arrayTest['order']['shipping']['contact']['postalCode'],
                'country_code' => $arrayTest['order']['shipping']['contact']['countryCode'],
            ],
            
        ];
        
        // Build Transaction Data
        $data['transaction'] = [
            'payment_type'     => 'GOOGLEPAY',
            'amount'           => $this->paymentHelper->convertAmountToSmallerUnit($basket->basketAmountNet),
            'currency'         => $paymentRequestPostData['nn_accept_gtc'],
            'test_mode'        => ($this->settingsService->getPaymentSettingsValue('test_mode', 'novalnet_googlepay') == true) ? 1 : 0,
            'enforce_3d'           => $paymentRequestPostData['nn_enforce'] ?? 0,
            'create_token'     => 1,
            'payment_data'     => [        
                'wallet_token' => $paymentRequestPostData['nn_google_pay_wallet_token'] 
            ]   
        ];
        
        $data['custom'] = [
        	'lang'      => strtoupper($this->sessionStorage->getLocaleSettings()->language),
        ];
        $this->getLogger(__METHOD__)->error('Novalnet::$data', $data);
	$this->sessionStorage->getPlugin()->setValue('nnExpressPaymentData',$data);
  	return $this->response->redirectTo('checkout?express=checkout');
    }


}
