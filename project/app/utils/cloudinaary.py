import cloudinaary.uploader

def upload_media(file_path:str):
    try:
        result=cloudinaary.uploader.upload(
            file_path,
            resource_type='auto'
        )

        return {
            "url":result["secure_url"],
            "public_id":result["public_id"],
            "resource_type":result["resource_type"]
        }
    except Exception as e:
        raise Exception(f"Error uploading media: {str(e)}")