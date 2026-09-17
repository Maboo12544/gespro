package lol.gespro.pos;
import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;
import com.sunmi.peripheral.printer.*;

// Native SDK adapter. Never retries automatically: a failed job may have printed partly.
public final class SunmiReceiptPrinter {
 private final Activity activity;
 private final Handler ui=new Handler(Looper.getMainLooper());
 private volatile SunmiPrinterService service;
 private volatile boolean busy=false;
 private Bitmap receipt;
 private int offset;
 private final InnerPrinterCallback connection=new InnerPrinterCallback(){
  protected void onConnected(SunmiPrinterService s){service=s;}
  protected void onDisconnected(){service=null;if(busy)fail();}
 };
 public SunmiReceiptPrinter(Activity a){activity=a;try{InnerPrinterManager.getInstance().bindService(a,connection);}catch(Exception ignored){}}
 public boolean available(){return service!=null;}
 public boolean busy(){return busy;}
 public void close(){try{InnerPrinterManager.getInstance().unBindService(activity,connection);}catch(Exception ignored){}service=null;}
 private void message(String s){ui.post(()->Toast.makeText(activity,s,Toast.LENGTH_LONG).show());}
 private void fail(){busy=false;receipt=null;message("Enpresyon pa konfime. Verifye papye, kouvèti ak tikè ki soti anvan ou reeseye.");}
 public void print(Bitmap image){
  if(busy){message("Yon tikè ap enprime deja.");return;}
  busy=true;receipt=image;offset=0;
  new Thread(()->{try{
   if(service==null){fail();return;}
   int state=service.updatePrinterState();
   if(state!=1){busy=false;receipt=null;message("SUNMI pa pare (eta "+state+"). Verifye papye ak kouvèti printer la.");return;}
   service.printerInit(null);service.setAlignment(1,null);next();
  }catch(Exception e){fail();}},"gespro-printer").start();
 }
 private void next(){
  if(!busy||service==null||receipt==null)return;
  try{
   if(offset>=receipt.getHeight()){service.lineWrap(3,null);busy=false;receipt=null;message("Tikè a voye bay SUNMI. Verifye fich ki soti a.");return;}
   int height=Math.min(256,receipt.getHeight()-offset);
   Bitmap strip=Bitmap.createBitmap(receipt,0,offset,receipt.getWidth(),height);offset+=height;
   service.printBitmap(strip,new InnerResultCallback(){
    public void onRunResult(boolean ok){if(ok)ui.post(()->new Thread(()->next(),"gespro-printer").start());else fail();}
    public void onReturnString(String s){}
    public void onRaiseException(int code,String s){fail();}
    public void onPrintResult(int code,String s){if(code!=0)fail();}
   });
  }catch(Exception e){fail();}
 }
}
