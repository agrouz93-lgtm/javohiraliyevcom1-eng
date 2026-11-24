package uz.ustapro;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

public class CameraProvider extends ContentProvider {
    @Override public boolean onCreate() {return true;}
    private File photo(Uri uri) throws FileNotFoundException {
        if (!"/capture.jpg".equals(uri.getPath())) throw new FileNotFoundException();
        return new File(getContext().getCacheDir(), "capture.jpg");
    }
    @Override public ParcelFileDescriptor openFile(Uri uri,String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(photo(uri),ParcelFileDescriptor.parseMode(mode));
    }
    @Override public String getType(Uri uri) {return "image/jpeg";}
    @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String order) {
        MatrixCursor cursor=new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE});
        try {File file=photo(uri);cursor.addRow(new Object[]{"capture.jpg",file.length()});}
        catch(FileNotFoundException exception) {return cursor;}
        return cursor;
    }
    @Override public Uri insert(Uri uri,ContentValues values) {throw new UnsupportedOperationException();}
    @Override public int update(Uri uri,ContentValues values,String selection,String[] args) {throw new UnsupportedOperationException();}
    @Override public int delete(Uri uri,String selection,String[] args) {throw new UnsupportedOperationException();}
}
