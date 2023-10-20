<?php
/**
 * This file is used for handling the payment cancel event procedure
 *
 * @author       Novalnet AG
 * @copyright(C) Novalnet
 * @license      https://www.novalnet.de/payment-plugins/kostenlos/lizenz
 */
namespace Novalnet\Procedures;

use Plenty\Modules\EventProcedures\Events\EventProceduresTriggered;
use Plenty\Modules\Order\Models\Order;
use Novalnet\Services\PaymentService;
use Novalnet\Constants\NovalnetConstants;
use Plenty\Plugin\Log\Loggable;

/**
 * Class VoidEventProcedure
 *
 * @package Novalnet\Procedures
 */
class InstalmentAllCycleEventProcedure
{
    use Loggable;
     /**
     *
     * @var PaymentService
     */
    private $paymentService;

    /**
     * Constructor.
     *
     * @param PaymentService $paymentService
     */

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * @param EventProceduresTriggered $eventTriggered
     *
     */
    public function run(EventProceduresTriggered $eventTriggered)
    {
        /* @var $order Order */
        $order = $eventTriggered->getOrder();
         $this->getLogger(__METHOD__)->error('Novalnet::$orderProperty', $order);
        // Load the order language
        foreach($order->properties as $orderProperty) {
            if($orderProperty->typeId == '6' ) {
                $orderLanguage = $orderProperty->value;
            }
        }
        // Get necessary information for the capture process
        $transactionDetails = $this->paymentService->getDetailsFromPaymentProperty($order->id);
        $transactionDetails['lang'] = $orderLanguage;
        $transactionDetails['cancel_type'] = 'CANCEL_ALL_CYCLES';
        // Call the Recurring details process for the Instalment payments
        $this->paymentService->doInstalmentVoid($transactionDetails, NovalnetConstants::INSTALMENT_VOID_URL);
    }
}
