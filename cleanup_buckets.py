import boto3
import sys

def empty_and_delete_bucket(bucket_name):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket_name)

    print(f"Processing bucket: {bucket_name}")

    try:
        # Check if bucket exists
        s3.meta.client.head_bucket(Bucket=bucket_name)
    except Exception as e:
        print(f"Bucket {bucket_name} does not exist or access denied. Skipping.")
        return

    # Delete all objects and versions
    try:
        print(f"  Emptying objects from {bucket_name}...")
        bucket.object_versions.delete()
        bucket.objects.delete()
        print(f"  Bucket {bucket_name} emptied.")
    except Exception as e:
        print(f"  Error emptying bucket {bucket_name}: {e}")

    # Delete the bucket itself
    try:
        print(f"  Deleting bucket {bucket_name}...")
        bucket.delete()
        print(f"  Bucket {bucket_name} deleted.")
    except Exception as e:
        print(f"  Error deleting bucket {bucket_name}: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python cleanup_buckets.py <stack_name_1> <stack_name_2> ...")
        sys.exit(1)

    cf = boto3.client('cloudformation')

    for stack_name in sys.argv[1:]:
        print(f"Checking stack: {stack_name}")
        try:
            # list_stack_resources does not always return physical IDs for deleted stacks,
            # but usually works for DELETE_FAILED stacks.
            resources = cf.list_stack_resources(StackName=stack_name)

            for res in resources.get('StackResourceSummaries', []):
                if res['ResourceType'] == 'AWS::S3::Bucket':
                    bucket_name = res['PhysicalResourceId']
                    if bucket_name:
                        empty_and_delete_bucket(bucket_name)
        except Exception as e:
            print(f"Error getting resources for stack {stack_name}: {e}")

if __name__ == "__main__":
    main()
